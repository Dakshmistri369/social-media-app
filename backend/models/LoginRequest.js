const mongoose = require('mongoose');

const loginRequestSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: 'Unknown' },
  username: { type: String, default: '' },
  // stores the hashed password temporarily to verify on approve
  passwordHash: { type: String, required: true, select: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  // once approved we store the token here for the client to pick up
  token: { type: String, default: '' },
  // reference to the actual user doc once approved
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-expire rejected/approved requests after 1 day
loginRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('LoginRequest', loginRequestSchema);
