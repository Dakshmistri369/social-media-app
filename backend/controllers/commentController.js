const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @GET /api/comments/post/:postId
exports.getComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      post: req.params.postId,
      parentComment: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar isVerified')
      .populate({
        path: 'replies',
        populate: { path: 'author', select: 'username name avatar isVerified' },
        options: { limit: 3 },
      });

    const total = await Comment.countDocuments({ post: req.params.postId, parentComment: null });
    res.json({ success: true, comments, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/comments/post/:postId
exports.createComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content required' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user._id,
      content,
      parentComment: parentComment || null,
    });

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id },
      });
    } else {
      await Post.findByIdAndUpdate(req.params.postId, {
        $push: { comments: comment._id },
      });
    }

    await comment.populate('author', 'username name avatar isVerified');

    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: parentComment ? 'reply' : 'comment',
        post: post._id,
        comment: comment._id,
        message: `${req.user.username} commented on your post`,
      });
    }

    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/comments/:id/like
exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isLiked = comment.likes.includes(req.user._id);
    if (isLiked) {
      comment.likes.pull(req.user._id);
    } else {
      comment.likes.push(req.user._id);
    }
    await comment.save();
    res.json({ success: true, likes: comment.likes.length, isLiked: !isLiked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/comments/:id
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, { $pull: { replies: comment._id } });
    }
    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
