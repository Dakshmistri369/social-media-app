const express = require('express');
const router = express.Router();
const { sendMessage, getConversations, getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, getConversations);
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.post('/messages', protect, sendMessage);

module.exports = router;
