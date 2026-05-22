const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { hasAbusiveLanguage } = require('../utils/badWordsFilter');

const sendMessage = async (req, res) => {
  try {
    const { recipientId, text, mediaUrl, mediaType } = req.body;
    const senderId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required' });
    }

    // Block messages containing abusive language
    if (hasAbusiveLanguage(text)) {
      return res.status(400).json({ success: false, message: 'Message contains abusive, profane, or inappropriate language.' });
    }

    // 1. Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, recipientId]
      });
      await conversation.save();
    }

    // 2. Create and save message
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      text: text || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'none'
    });

    await message.save();

    // 3. Update last message in conversation
    conversation.lastMessage = message._id;
    await conversation.save();

    // 4. Populate message details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .exec();

    // 5. Emit real-time message via socket.io
    const recipientSocketId = req.onlineUsers.get(recipientId.toString());
    if (recipientSocketId) {
      req.io.to(recipientSocketId).emit('newMessage', populatedMessage);
      
      // Also notify recipient to refresh their conversations list
      req.io.to(recipientSocketId).emit('conversationUpdated', {
        conversationId: conversation._id,
        lastMessage: populatedMessage
      });
    }

    res.status(201).json({ success: true, message: populatedMessage, conversationId: conversation._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name username avatar bio lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username avatar' }
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name username avatar')
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages
};
