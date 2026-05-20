const express = require('express');
const router = express.Router();
const { uploadMedia, uploadAvatar } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

router.post('/media', protect, uploadMedia);
router.post('/avatar', protect, uploadAvatar);

module.exports = router;
