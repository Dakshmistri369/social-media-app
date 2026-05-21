const express = require('express');
const router = express.Router();
const { getStories, createStory, viewStory } = require('../controllers/storyController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getStories);
router.post('/', protect, createStory);
router.put('/:id/view', protect, viewStory);

module.exports = router;
