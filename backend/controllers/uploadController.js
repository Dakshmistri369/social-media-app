const path = require('path');
const fs = require('fs');

// Local file upload (for dev without Cloudinary)
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files || !req.files.media) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const files = Array.isArray(req.files.media) ? req.files.media : [req.files.media];
    const uploaded = [];

    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    for (const file of files) {
      const ext = path.extname(file.name);
      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await file.mv(filepath);

      const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext.toLowerCase());
      uploaded.push({
        url: `/uploads/${filename}`,
        type: isVideo ? 'video' : 'image',
      });
    }

    res.json({ success: true, media: uploaded });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const file = req.files.avatar;
    const ext = path.extname(file.name);
    const filename = `avatar-${req.user._id}${ext}`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    await file.mv(path.join(uploadDir, filename));
    const url = `/uploads/avatars/${filename}`;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { avatar: url });
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
