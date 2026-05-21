const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  media: [
    {
      url: { type: String },
      type: { type: String, enum: ['image', 'video'] },
      thumbnail: { type: String },
    },
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      type: { type: String, enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'], default: 'like', required: true }
    }
  ],
  poll: {
    question: { type: String },
    options: [
      {
        optionText: { type: String, required: true },
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
    expiresAt: { type: Date }
  },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  hashtags: [{ type: String }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isRepost: { type: Boolean, default: false },
  originalPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public',
  },
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ content: 'text' });

module.exports = mongoose.model('Post', postSchema);
