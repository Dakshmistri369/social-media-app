const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { validatePassword } = require('../utils/passwordValidator');
const { hasAbusiveLanguage } = require('../utils/badWordsFilter');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// @POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !email || !password || !name)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    // Prevent registrations with abusive usernames, names, or emails
    if (hasAbusiveLanguage(username) || hasAbusiveLanguage(name) || hasAbusiveLanguage(email)) {
      return res.status(400).json({
        success: false,
        message: 'Registration blocked: Abusive, profane, or inappropriate language is strictly prohibited.'
      });
    }

    // Validate password strength before registering
    const pwdCheck = validatePassword(password, { username, email, name });
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet the strong password criteria: ' + pwdCheck.errors.join(' '),
        errors: pwdCheck.errors
      });
    }

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

// @POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    if (hasAbusiveLanguage(email)) {
      return res.status(400).json({
        success: false,
        message: 'Login blocked: Abusive, profane, or inappropriate language is strictly prohibited.'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Validate password strength before allowing login
    const pwdCheck = validatePassword(password, { username: user.username, email: user.email, name: user.name });
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Login blocked: Your password does not meet the current security criteria. Details: ' + pwdCheck.errors.join(' '),
        errors: pwdCheck.errors
      });
    }

    const token = generateToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/auth/me
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
