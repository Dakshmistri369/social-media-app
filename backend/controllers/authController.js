const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const LoginRequest = require('../models/LoginRequest');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// ─────────────────────────────────────────────────────────────────────────────
// @POST /api/auth/register  (direct — admin bypass only)
// ─────────────────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !email || !password || !name)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser)
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username taken',
      });

    const user = await User.create({ username, email, password, name });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @POST /api/auth/register-request
// Creates the user account immediately but returns a requestId instead of a
// token. The account is "pending" until the admin approves the LoginRequest.
// ─────────────────────────────────────────────────────────────────────────────
exports.requestRegister = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !email || !password || !name)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser)
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username taken',
      });

    // Create the user account (normal flow — no token yet)
    const user = await User.create({ username, email, password, name });

    // Store password hash so we can issue token on approval
    const passwordHash = await bcrypt.hash(password, 10);

    // Remove any stale pending request for the same email
    await LoginRequest.deleteMany({ email, status: 'pending' });

    const loginReq = await LoginRequest.create({
      email,
      name: user.name,
      username: user.username,
      passwordHash,
      userId: user._id,
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Notify admin via Socket.io
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser && req.io) {
      const adminSocketId = req.onlineUsers?.get(adminUser._id.toString());
      if (adminSocketId) {
        req.io.to(adminSocketId).emit('loginRequest', {
          requestId: loginReq._id,
          email: user.email,
          name: user.name,
          username: user.username,
          type: 'register',
          userAgent: loginReq.userAgent,
          createdAt: loginReq.createdAt,
        });
      }
    }

    res.status(201).json({
      success: true,
      requestId: loginReq._id,
      message: 'Account created! Waiting for admin approval before you can sign in.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @POST /api/auth/login  (direct login — kept for admin self-login)
// ─────────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id);
    const userObj = user.toJSON();
    res.json({ success: true, token, user: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @POST /api/auth/login-request
// Regular users hit this — validates credentials but does NOT log them in.
// Creates a LoginRequest doc and notifies the admin via socket.
// ─────────────────────────────────────────────────────────────────────────────
exports.requestLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    // Validate credentials first (no point waiting for approval if wrong password)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Admin bypasses the approval queue — log in directly
    if (user.role === 'admin') {
      const token = generateToken(user._id);
      return res.json({ success: true, direct: true, token, user: user.toJSON() });
    }

    // Delete any stale pending request from same email
    await LoginRequest.deleteMany({ email, status: 'pending' });

    // Hash password for storage (so admin approval can issue token without re-entering it)
    const passwordHash = await bcrypt.hash(password, 10);

    const loginReq = await LoginRequest.create({
      email,
      name: user.name,
      username: user.username,
      passwordHash,
      userId: user._id,
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Notify admin in real-time via Socket.io
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser && req.io) {
      const adminSocketId = req.onlineUsers?.get(adminUser._id.toString());
      if (adminSocketId) {
        req.io.to(adminSocketId).emit('loginRequest', {
          requestId: loginReq._id,
          email: user.email,
          name: user.name,
          username: user.username,
          userAgent: loginReq.userAgent,
          createdAt: loginReq.createdAt,
        });
      }
    }

    res.json({ success: true, requestId: loginReq._id, message: 'Login request sent. Waiting for admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @GET /api/auth/login-requests   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.listLoginRequests = async (req, res) => {
  try {
    const requests = await LoginRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .select('-passwordHash');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @PUT /api/auth/login-requests/:id/approve   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.approveLoginRequest = async (req, res) => {
  try {
    const loginReq = await LoginRequest.findById(req.params.id);
    if (!loginReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (loginReq.status !== 'pending')
      return res.status(400).json({ success: false, message: `Request already ${loginReq.status}` });

    const user = await User.findById(loginReq.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const token = generateToken(user._id);

    loginReq.status   = 'approved';
    loginReq.approvedAt = new Date();
    loginReq.token    = token;
    await loginReq.save();

    // Push the token to the waiting user in real-time
    if (req.io) {
      req.io.emit(`loginApproved:${loginReq._id}`, { token, user: user.toJSON() });
    }

    res.json({ success: true, message: `${user.name} approved` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @PUT /api/auth/login-requests/:id/reject   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectLoginRequest = async (req, res) => {
  try {
    const loginReq = await LoginRequest.findById(req.params.id);
    if (!loginReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (loginReq.status !== 'pending')
      return res.status(400).json({ success: false, message: `Request already ${loginReq.status}` });

    loginReq.status     = 'rejected';
    loginReq.rejectedAt = new Date();
    await loginReq.save();

    // Notify the waiting user
    if (req.io) {
      req.io.emit(`loginRejected:${loginReq._id}`, { message: 'Your login was rejected by the admin.' });
    }

    res.json({ success: true, message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @GET /api/auth/login-requests/:id/status   (public — polled by waiting client)
// ─────────────────────────────────────────────────────────────────────────────
exports.getLoginRequestStatus = async (req, res) => {
  try {
    const loginReq = await LoginRequest.findById(req.params.id);
    if (!loginReq) return res.status(404).json({ success: false, message: 'Request not found or expired' });

    if (loginReq.status === 'approved') {
      const user = await User.findById(loginReq.userId);
      return res.json({ success: true, status: 'approved', token: loginReq.token, user });
    }

    res.json({ success: true, status: loginReq.status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
