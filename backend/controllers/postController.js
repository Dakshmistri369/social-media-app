const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @GET /api/posts/feed
exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let authorFilter = {};
    if (req.user) {
      const following = req.user.following;
      authorFilter = { author: { $in: [...following, req.user._id] } };
    }

    const posts = await Post.find({ ...authorFilter, visibility: 'public' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar isVerified')
      .populate('originalPost')
      .lean();

    const total = await Post.countDocuments({ ...authorFilter, visibility: 'public' });

    res.json({
      success: true,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/posts/explore
exports.getExplorePosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const tag = req.query.tag;

    const filter = { visibility: 'public' };
    if (tag) filter.hashtags = tag;

    const posts = await Post.find(filter)
      .sort({ likes: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar isVerified')
      .lean();

    const total = await Post.countDocuments(filter);
    res.json({ success: true, posts, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/posts/:id
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('author', 'username name avatar isVerified bio')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username name avatar' },
        options: { sort: { createdAt: -1 }, limit: 20 },
      });

    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const { content, visibility, hashtags } = req.body;
    let media = [];

    if (req.body.media && Array.isArray(req.body.media)) {
      media = req.body.media;
    }

    if (!content && media.length === 0) {
      return res.status(400).json({ success: false, message: 'Post must have content or media' });
    }

    const extractedHashtags = (content || '').match(/#\w+/g)?.map(t => t.toLowerCase()) || [];
    const allHashtags = [...new Set([...(hashtags || []), ...extractedHashtags])];

    const post = await Post.create({
      author: req.user._id,
      content,
      media,
      visibility: visibility || 'public',
      hashtags: allHashtags,
    });

    await post.populate('author', 'username name avatar isVerified');
    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updated = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('author', 'username name avatar isVerified');
    res.json({ success: true, post: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Comment.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/posts/:id/like
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          post: post._id,
          message: `${req.user.username} liked your post`,
        });
        req.io?.emit('notification', { recipient: post.author });
      }
    }

    await post.save();
    res.json({ success: true, likes: post.likes.length, isLiked: !isLiked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/posts/:id/repost
exports.repost = async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = await Post.findOne({
      author: req.user._id,
      isRepost: true,
      originalPost: originalPost._id,
    });

    if (existing) {
      await Post.findByIdAndDelete(existing._id);
      originalPost.shares.pull(req.user._id);
      await originalPost.save();
      return res.json({ success: true, message: 'Repost removed', isReposted: false });
    }

    originalPost.shares.push(req.user._id);
    await originalPost.save();

    const repost = await Post.create({
      author: req.user._id,
      content: originalPost.content,
      media: originalPost.media,
      isRepost: true,
      originalPost: originalPost._id,
      visibility: 'public',
    });

    await repost.populate('author', 'username name avatar isVerified');
    res.status(201).json({ success: true, repost, isReposted: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/posts/:id/save
exports.savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const user = await User.findById(req.user._id);
    const isSaved = user.savedPosts.includes(post._id);

    if (isSaved) {
      user.savedPosts.pull(post._id);
    } else {
      user.savedPosts.push(post._id);
    }
    await user.save();
    res.json({ success: true, isSaved: !isSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/posts/search
exports.searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, posts: [] });
    const posts = await Post.find({
      $text: { $search: q },
      visibility: 'public',
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .populate('author', 'username name avatar isVerified');
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
