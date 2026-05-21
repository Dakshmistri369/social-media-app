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
    const { content, visibility, hashtags, poll } = req.body;
    let media = [];

    if (req.body.media && Array.isArray(req.body.media)) {
      media = req.body.media;
    }

    let pollData = undefined;
    if (poll && poll.question && Array.isArray(poll.options) && poll.options.length > 0) {
      pollData = {
        question: poll.question,
        options: poll.options.filter(o => o.trim() !== '').map(text => ({ optionText: text, votes: [] })),
        expiresAt: poll.duration ? new Date(Date.now() + parseInt(poll.duration) * 60 * 60 * 1000) : undefined
      };
    }

    if (!content && media.length === 0 && !pollData) {
      return res.status(400).json({ success: false, message: 'Post must have content, media, or a poll' });
    }

    const extractedHashtags = (content || '').match(/#\w+/g)?.map(t => t.toLowerCase()) || [];
    const allHashtags = [...new Set([...(hashtags || []), ...extractedHashtags])];

    const post = await Post.create({
      author: req.user._id,
      content,
      media,
      poll: pollData,
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

// @POST /api/posts/ai-caption
exports.generateAICaption = async (req, res) => {
  let { prompt, tone } = req.body;
  const isEmpty = !prompt || prompt.trim() === '';
  
  if (isEmpty) {
    prompt = 'Create a random status update about coding, building projects, or dev life.';
  }

  const getLocalFallback = (p, t) => {
    if (isEmpty) {
      const starters = {
        professional: "Excited to share that I'm refactoring our core microservices today. Constant optimization pays off! 💻📈 #building #scaling",
        funny: "Spent 3 hours writing a script to automate a task that takes 5 seconds. Modern developer problems. 😂🤖 #programming #life",
        cyberpunk: "[SYSTEM TRIGGER] Grid sync complete. Overclocking database nodes in the dark room. 🌐⚡ #cyberpunk #neon #loopix",
        sarcastic: "Nothing says productivity like a 90-minute meeting to discuss the next meeting. Brilliant. 🙄👔 #worklife #agile"
      };
      return starters[t?.toLowerCase()] || "Coding away on some exciting new app updates. Stay tuned! 🚀💻 #build #loopix";
    }
    const tones = {
      professional: `Here is a refined version of your draft: "${p}". Looking forward to sharing this with the community. #networking #business`,
      funny: `So, I was thinking about: "${p}" and honestly, it's pretty funny. 😂 #lol #relatable`,
      cyberpunk: `[SYSTEM UPDATE] Draft processed: "${p}". Cyber-grid synced. 🌐⚡ #cyberpunk #neon #loopix`,
      sarcastic: `Oh, look at this masterpiece: "${p}". Groundbreaking. 🙄 #sarcasm #insightful`
    };
    return tones[t?.toLowerCase()] || `Refined draft: "${p}". #loopix #social`;
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_') || apiKey.includes('change_me')) {
      const text = getLocalFallback(prompt, tone);
      return res.json({ success: true, caption: text });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = isEmpty
      ? `You are a social media post assistant for a platform called Loopix. Loopix is a modern, dark-themed, premium tech-focused social media app.
Your task is to generate a short, engaging, and catchy random status update / post about developer life, technology, programming, or coding.
The user wants the tone of this generated post to be: "${tone || 'casual'}".
Additionally, append 2-3 relevant hashtags at the very end of the post.
Output ONLY the generated post content. Do not include any intros, titles, quotes or explanations.`
      : `You are a social media post assistant for a platform called Loopix. Loopix is a modern, dark-themed, premium tech-focused social media app. 
Your task is to take the user's post draft and rewrite it to make it engaging, clean, and catchy.
The user wants the tone to be: "${tone || 'casual'}".
Additionally, append 2-3 relevant hashtags at the very end of the post.
Output ONLY the generated post content. Do not include any intros, titles, quotes or explanations.`;

    const result = await model.generateContent([
      systemPrompt,
      isEmpty ? "Generate status now." : `User's Post Draft: ${prompt}`
    ]);
    const response = await result.response;
    const text = response.text().trim();

    res.json({ success: true, caption: text });
  } catch (err) {
    console.error('Gemini API Error, falling back to local processing:', err.message);
    const text = getLocalFallback(prompt, tone);
    res.json({ success: true, caption: text, note: 'fallback active due to API issue' });
  }
};

// @PUT /api/posts/:id/react
exports.reactPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const userId = req.user._id;
    const { type } = req.body;
    
    if (!['like', 'love', 'haha', 'wow', 'sad', 'angry'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction type' });
    }

    if (!post.reactions) {
      post.reactions = [];
    }

    const existingIndex = post.reactions.findIndex(r => r.user.toString() === userId.toString());

    if (existingIndex > -1) {
      if (post.reactions[existingIndex].type === type) {
        // Toggle off if clicking the same reaction
        post.reactions.splice(existingIndex, 1);
      } else {
        // Change reaction type
        post.reactions[existingIndex].type = type;
      }
    } else {
      // Add new reaction
      post.reactions.push({ user: userId, type });
      
      // Notify author
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like', // Notification type fallback
          post: post._id,
          message: `${req.user.username} reacted with ${type} to your post`,
        });
        req.io?.emit('notification', { recipient: post.author });
      }
    }

    await post.save();
    res.json({ success: true, reactions: post.reactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/posts/:id/poll/vote
exports.votePoll = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.poll || !post.poll.options) {
      return res.status(400).json({ success: false, message: 'Post does not contain a poll' });
    }

    if (post.poll.expiresAt && new Date() > new Date(post.poll.expiresAt)) {
      return res.status(400).json({ success: false, message: 'Poll has expired' });
    }

    const userId = req.user._id;
    const { optionId } = req.body;

    // Check if user has already voted in this poll
    let userVotedOptionId = null;
    post.poll.options.forEach(opt => {
      if (opt.votes.some(vId => vId.toString() === userId.toString())) {
        userVotedOptionId = opt._id.toString();
      }
    });

    if (userVotedOptionId) {
      // Toggle off if voting for the same option, or transition to the new option
      post.poll.options.forEach(opt => {
        if (opt._id.toString() === userVotedOptionId) {
          opt.votes = opt.votes.filter(vId => vId.toString() !== userId.toString());
        }
      });

      if (userVotedOptionId !== optionId) {
        const option = post.poll.options.id(optionId);
        if (option) {
          option.votes.push(userId);
        }
      }
    } else {
      const option = post.poll.options.id(optionId);
      if (!option) {
        return res.status(404).json({ success: false, message: 'Poll option not found' });
      }
      option.votes.push(userId);
    }

    await post.save();
    res.json({ success: true, poll: post.poll });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
