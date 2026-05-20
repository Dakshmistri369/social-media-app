const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Cloudinary is configured via env vars:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// If not set we fall back to local-style responses (for dev without Cloudinary).
const cloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Helper: upload a Buffer to Cloudinary via stream
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// @POST /api/upload/media
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files || !req.files.media) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const files = Array.isArray(req.files.media) ? req.files.media : [req.files.media];

    // ── Cloudinary path ──────────────────────────────────────────────────────
    if (cloudinaryConfigured) {
      const uploaded = [];
      for (const file of files) {
        const isVideo = file.mimetype.startsWith('video/');
        const result = await uploadToCloudinary(file.data, {
          folder: 'social-media/posts',
          resource_type: isVideo ? 'video' : 'image',
          quality: 'auto',
          fetch_format: 'auto',
        });
        uploaded.push({
          url:  result.secure_url,
          type: isVideo ? 'video' : 'image',
        });
      }
      return res.json({ success: true, media: uploaded });
    }

    // ── Fallback: local filesystem (dev only, won't persist on Vercel) ───────
    const path = require('path');
    const fs   = require('fs');
    const uploaded = [];
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    for (const file of files) {
      const ext = path.extname(file.name);
      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await file.mv(filepath);
      const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext.toLowerCase());
      uploaded.push({ url: `/uploads/${filename}`, type: isVideo ? 'video' : 'image' });
    }
    return res.json({ success: true, media: uploaded });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/upload/avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const file = req.files.avatar;

    // ── Cloudinary path ──────────────────────────────────────────────────────
    if (cloudinaryConfigured) {
      const result = await uploadToCloudinary(file.data, {
        folder: 'social-media/avatars',
        public_id: `avatar-${req.user._id}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
        quality: 'auto',
        fetch_format: 'auto',
      });
      const url = result.secure_url;
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { avatar: url });
      return res.json({ success: true, url });
    }

    // ── Fallback: local filesystem ────────────────────────────────────────────
    const path = require('path');
    const fs   = require('fs');
    const ext  = require('path').extname(file.name);
    const filename = `avatar-${req.user._id}${ext}`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    await file.mv(path.join(uploadDir, filename));
    const url = `/uploads/avatars/${filename}`;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { avatar: url });
    return res.json({ success: true, url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
