const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ── GET /api/admin/users ─────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const query = search
      ? {
          $or: [
            { name:     { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { email:    { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name username email avatar role isVerified followers following createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/admin/stats ─────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const total   = await User.countDocuments();
    const admins  = await User.countDocuments({ role: 'admin' });
    const verified = await User.countDocuments({ isVerified: true });
    const today   = new Date(); today.setHours(0,0,0,0);
    const newToday = await User.countDocuments({ createdAt: { $gte: today } });
    res.json({ success: true, stats: { total, admins, verified, newToday } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/admin/users/:id ──────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: "You can't delete your own account" });

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: `${user.name} has been deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/admin/users/:id/role ───────────────────────
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Role must be user or admin' });

    if (req.params.id === req.user._id.toString() && role !== 'admin')
      return res.status(400).json({ success: false, message: "You can't demote yourself" });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user, message: `${user.name} is now ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/admin/users/:id/verify ─────────────────────
exports.toggleVerify = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isVerified = !user.isVerified;
    await user.save();
    res.json({ success: true, user, message: user.isVerified ? `${user.name} verified ✓` : `${user.name} unverified` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/admin/users ─────────────────────────────── 
exports.createUser = async (req, res) => {
  try {
    const { name, username, email, password, role = 'user' } = req.body;
    if (!name || !username || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(400).json({
        success: false,
        message: exists.email === email ? 'Email already in use' : 'Username taken',
      });

    const user = await User.create({ name, username, email, password, role });
    res.status(201).json({ success: true, user, message: `Account for ${name} created` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
