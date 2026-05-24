const express = require('express');
const router  = express.Router();
const { register, login, getMe, sendOtp, verifyOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', protect, getMe);

module.exports = router;
