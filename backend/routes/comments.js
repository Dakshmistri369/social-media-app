const express = require('express');
const router = express.Router();
const {
  getComments, createComment, likeComment, deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.get('/post/:postId', getComments);
router.post('/post/:postId', protect, createComment);
router.put('/:id/like', protect, likeComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
