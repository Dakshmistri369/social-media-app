const express = require('express');
const router = express.Router();
const {
  getFeed, getExplorePosts, getPost, createPost, updatePost, deletePost,
  likePost, repost, savePost, searchPosts, generateAICaption, reactPost, votePoll,
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');

// Specific routes MUST come before wildcard /:id routes
router.get('/feed', optionalAuth, getFeed);
router.get('/explore', optionalAuth, getExplorePosts);
router.get('/search', searchPosts);
router.post('/ai-caption', protect, generateAICaption);
router.post('/', protect, createPost);

// Wildcard routes (must be last)
router.get('/:id', optionalAuth, getPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, likePost);
router.put('/:id/react', protect, reactPost);
router.put('/:id/poll/vote', protect, votePoll);
router.post('/:id/repost', protect, repost);
router.post('/:id/save', protect, savePost);

module.exports = router;
