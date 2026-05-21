const express = require('express');
const router  = express.Router();
const {
  register,
  login,
  getMe,
  requestLogin,
  listLoginRequests,
  approveLoginRequest,
  rejectLoginRequest,
  getLoginRequestStatus,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

// Public
router.post('/register',      register);
router.post('/login',         login);            // admin direct login
router.post('/login-request', requestLogin);     // user login → needs approval

// Status polling (no auth needed — client polls by requestId)
router.get('/login-requests/:id/status', getLoginRequestStatus);

// Admin only
router.get('/login-requests',             protect, adminOnly, listLoginRequests);
router.put('/login-requests/:id/approve', protect, adminOnly, approveLoginRequest);
router.put('/login-requests/:id/reject',  protect, adminOnly, rejectLoginRequest);

// Current user
router.get('/me', protect, getMe);

module.exports = router;
