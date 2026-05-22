import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  RiImageLine, RiVideoLine, RiCloseLine, RiSendPlane2Fill,
  RiGlobalLine, RiLockLine, RiGroupLine, RiMagicLine, RiBarChartLine,
} from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import usePostStore from '../../store/postStore';
import API from '../../utils/api';
import { compressImage } from '../../utils/imageCompressor';
import { hasAbusiveLanguage } from '../../utils/badWordsFilter';
import toast from 'react-hot-toast';
import './CreatePost.css';

const MAX_CHARS = 2000;

export default function CreatePost() {
  const { user } = useAuthStore();
  const { addPost } = usePostStore();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState('casual');
  const [showAiPopover, setShowAiPopover] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState('24');

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 4,
    maxSize: 50 * 1024 * 1024,
    onDrop: (accepted) => {
      if (mediaFiles.length + accepted.length > 4) {
        toast.error('Max 4 files allowed');
        return;
      }
      const newPreviews = accepted.map((f) => ({
        url: URL.createObjectURL(f),
        type: f.type.startsWith('video') ? 'video' : 'image',
        file: f,
      }));
      setMediaFiles((prev) => [...prev, ...accepted]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
  });

  const removeMedia = (i) => {
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleSubmit = async () => {
    const hasPoll = showPollCreator && pollQuestion.trim() && pollOptions.filter(o => o.trim() !== '').length >= 2;
    if (!content.trim() && mediaFiles.length === 0 && !hasPoll) {
      toast.error('Write something, add media, or create a complete poll!');
      return;
    }

    // Check for abusive language in posts
    if (hasAbusiveLanguage(content)) {
      toast.error('Post content contains abusive, profane, or inappropriate language.');
      return;
    }
    if (hasPoll && (hasAbusiveLanguage(pollQuestion) || pollOptions.some(o => hasAbusiveLanguage(o)))) {
      toast.error('Poll contains abusive, profane, or inappropriate language.');
      return;
    }

    setIsLoading(true);
    try {
      let uploadedMedia = [];
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        
        // Compress images client-side before sending to optimize resolution and size
        for (const file of mediaFiles) {
          if (file.type.startsWith('image/')) {
            try {
              const compressed = await compressImage(file, 1200, 1200, 0.8);
              formData.append('media', compressed);
            } catch (err) {
              console.error('Image compression failed, using original file:', err);
              formData.append('media', file);
            }
          } else {
            formData.append('media', file);
          }
        }

        const { data } = await API.post('/upload/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedMedia = data.media;
      }

      const payload = {
        content: content.trim(),
        media: uploadedMedia,
        visibility,
      };

      if (hasPoll) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.filter(o => o.trim() !== ''),
          duration: pollDuration,
        };
      }

      const { data } = await API.post('/posts', payload);

      addPost(data.post);
      setContent('');
      setMediaFiles([]);
      setPreviews([]);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollDuration('24');
      setShowPollCreator(false);
      setFocused(false);
      toast.success('Post published! 🚀');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiImprove = async () => {
    const isNewGenerated = !content.trim();
    setIsAiLoading(true);
    try {
      const { data } = await API.post('/posts/ai-caption', {
        prompt: content,
        tone: aiTone,
      });
      if (data.success) {
        setContent(data.caption);
        toast.success(isNewGenerated ? 'AI post generated! ✨' : 'Caption improved by AI! ✨');
        setShowAiPopover(false);
      } else {
        toast.error('AI generation failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI service unavailable');
    } finally {
      setIsAiLoading(false);
    }
  };

  const charsLeft = MAX_CHARS - content.length;
  const visibilityIcons = {
    public: <RiGlobalLine />,
    followers: <RiGroupLine />,
    private: <RiLockLine />,
  };

  return (
    <div className={`create-post ${focused ? 'focused' : ''}`}>
      <div className="create-post-header">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="avatar avatar-md" />
        ) : (
          <div className="avatar-placeholder avatar-md">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="create-post-input-area">
          <textarea
            className="create-post-textarea"
            placeholder="Document a new growth or sync..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            maxLength={MAX_CHARS}
            rows={focused ? 4 : 2}
          />

          {/* Previews */}
          {previews.length > 0 && (
            <div className={`preview-grid preview-${previews.length}`}>
              {previews.map((p, i) => (
                <div key={i} className="preview-item">
                  {p.type === 'video' ? (
                    <video src={p.url} className="preview-media" />
                  ) : (
                    <img src={p.url} alt="" className="preview-media" />
                  )}
                  <button className="preview-remove" onClick={() => removeMedia(i)}>
                    <RiCloseLine />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Poll Creator Drawer */}
          {showPollCreator && (
            <div className="poll-creator-card scale-in">
              <div className="poll-creator-header">
                <span className="poll-creator-title">CREATE AN INTERACTIVE POLL</span>
                <button
                  type="button"
                  className="poll-creator-close"
                  onClick={() => setShowPollCreator(false)}
                >
                  <RiCloseLine />
                </button>
              </div>
              <input
                type="text"
                className="poll-question-input"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
              <div className="poll-creator-options">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="poll-option-input-wrap">
                    <input
                      type="text"
                      className="poll-option-input"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(i, e.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        className="poll-option-remove"
                        onClick={() => handleRemovePollOption(i)}
                      >
                        <RiCloseLine />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="poll-creator-actions">
                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    className="poll-option-add-btn"
                    onClick={handleAddPollOption}
                  >
                    + Add Option
                  </button>
                )}
                <div className="poll-duration-wrap">
                  <label>Duration:</label>
                  <select
                    value={pollDuration}
                    onChange={(e) => setPollDuration(e.target.value)}
                    className="poll-duration-select"
                  >
                    <option value="1">1 Hour</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          {focused && (
            <div className="create-post-toolbar">
              <div className="toolbar-left">
                <div {...getRootProps()} style={{ display: 'inline-block', outline: 'none' }}>
                  <input {...getInputProps()} />
                  <div className="toolbar-btn" role="button">
                    <RiImageLine /> MEDIA
                  </div>
                </div>
                <button className="toolbar-btn sync-btn" type="button">
                  <RiGlobalLine /> SYNC
                </button>
                <button
                  className={`toolbar-btn poll-trigger-btn ${showPollCreator ? 'active' : ''}`}
                  type="button"
                  onClick={() => setShowPollCreator(!showPollCreator)}
                >
                  <RiBarChartLine /> POLL
                </button>
                <div className="ai-assistant-wrap">
                  <button
                    className="toolbar-btn ai-spark-btn"
                    type="button"
                    onClick={() => setShowAiPopover(!showAiPopover)}
                  >
                    <RiMagicLine /> AI WRITE
                  </button>
                  {showAiPopover && (
                    <div className="ai-popover scale-in">
                      <div className="ai-popover-title">AI Enhancer</div>
                      <select
                        className="ai-select"
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                      >
                        <option value="casual">Casual</option>
                        <option value="professional">Professional</option>
                        <option value="funny">Funny</option>
                        <option value="cyberpunk">Cyberpunk</option>
                        <option value="sarcastic">Sarcastic</option>
                      </select>
                      <button
                        className="btn btn-primary btn-sm ai-generate-btn"
                        onClick={handleAiImprove}
                        disabled={isAiLoading || !content.trim()}
                        type="button"
                      >
                        {isAiLoading ? 'Improving...' : 'Improve'}
                      </button>
                    </div>
                  )}
                </div>
                <select
                  className="visibility-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Only me</option>
                </select>
              </div>

              <div className="toolbar-right">
                {content.length > 0 && (
                  <span className={`char-count ${charsLeft < 50 ? 'warning' : ''}`}>
                    {charsLeft}
                  </span>
                )}
                <button
                  className="btn btn-primary btn-sm post-submit-btn"
                  onClick={handleSubmit}
                  disabled={isLoading || (!content.trim() && mediaFiles.length === 0)}
                >
                  {isLoading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'PUBLISH'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
