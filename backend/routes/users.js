const express = require('express');
const router = express.Router();
const {
  searchUsers, getSuggestions, getProfile, getUserPosts,
  updateProfile, followUser, getSavedPosts,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Specific routes MUST come before wildcard /:username and /:id routes
router.get('/search', searchUsers);
router.get('/suggestions', protect, getSuggestions);
router.get('/saved', protect, getSavedPosts);
router.put('/profile/update', protect, updateProfile);

// Wildcard routes (must be last)
router.get('/:username', getProfile);
router.get('/:username/posts', getUserPosts);
router.put('/:id/follow', protect, followUser);

module.exports = router;
