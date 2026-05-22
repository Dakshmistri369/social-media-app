const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { hasAbusiveLanguage } = require('../utils/badWordsFilter');

// @GET /api/users/search
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
    }).select('username name avatar bio isVerified followers').limit(10).lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/suggestions
exports.getSuggestions = async (req, res) => {
  try {
    const following = req.user.following;
    const users = await User.find({
      _id: { $nin: [...following, req.user._id] },
    })
      .select('username name avatar bio isVerified followers')
      .limit(5)
      .lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/:username
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/:username/posts
exports.getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: user._id, visibility: 'public' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar isVerified')
      .lean();

    const total = await Post.countDocuments({ author: user._id, visibility: 'public' });
    res.json({ success: true, posts, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, website, location, avatar, coverImage } = req.body;
    
    // Prevent abusive language in profile updates
    if (hasAbusiveLanguage(name) || hasAbusiveLanguage(bio) || hasAbusiveLanguage(website) || hasAbusiveLanguage(location)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile update blocked: Abusive, profane, or inappropriate language is not allowed.' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, website, location, avatar, coverImage },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/users/:id/follow
exports.followUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(targetUser._id);

    if (isFollowing) {
      currentUser.following.pull(targetUser._id);
      targetUser.followers.pull(currentUser._id);
    } else {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow',
        message: `${currentUser.username} started following you`,
      });
      req.io?.emit('notification', { recipient: targetUser._id });
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/saved
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: { path: 'author', select: 'username name avatar isVerified' },
      options: { sort: { createdAt: -1 } },
    }).lean();
    res.json({ success: true, posts: user.savedPosts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
