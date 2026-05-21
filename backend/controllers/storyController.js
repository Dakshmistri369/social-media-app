const Story = require('../models/Story');
const User = require('../models/User');

const getStories = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Fetch stories from the user themselves and people they follow
    const followingAndMe = [...currentUser.following, req.user.id];

    const stories = await Story.find({ user: { $in: followingAndMe } })
      .populate('user', 'name username avatar')
      .sort({ createdAt: 1 });

    // Group stories by user
    const grouped = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: story.user,
          stories: []
        };
      }
      grouped[userId].stories.push(story);
    });

    res.json({ success: true, stories: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createStory = async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media URL is required' });
    }

    const newStory = new Story({
      user: req.user.id,
      mediaUrl,
      mediaType: mediaType || 'image',
      caption: caption || ''
    });

    await newStory.save();
    const populated = await newStory.populate('user', 'name username avatar');
    res.status(201).json({ success: true, story: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    if (!story.views.includes(req.user.id)) {
      story.views.push(req.user.id);
      await story.save();
    }

    res.json({ success: true, story });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getStories,
  createStory,
  viewStory
};
