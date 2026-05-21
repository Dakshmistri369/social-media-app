import { useState, useEffect, useRef } from 'react';
import { RiAddLine, RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import API from '../../utils/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import './Stories.css';

export default function Stories() {
  const { user } = useAuthStore();
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeUserIndex, setActiveUserIndex] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const progressInterval = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const { data } = await API.get('/stories');
      if (data.success) {
        setGroupedStories(data.stories);
      }
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading story...');

    try {
      // 1. Upload to media endpoint
      const formData = new FormData();
      formData.append('media', file);
      const uploadRes = await API.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!uploadRes.data?.media?.length) {
        throw new Error('Upload failed');
      }

      const mediaItem = uploadRes.data.media[0];

      // 2. Create story doc
      const storyRes = await API.post('/stories', {
        mediaUrl: mediaItem.url,
        mediaType: mediaItem.type,
        caption: ''
      });

      if (storyRes.data.success) {
        toast.success('Story posted successfully!', { id: toastId });
        fetchStories();
      }
    } catch (err) {
      toast.error('Failed to post story', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Story playback timer
  useEffect(() => {
    if (activeUserIndex !== null) {
      setProgress(0);
      const duration = 5000; // 5 seconds per story
      const intervalTime = 100;
      const steps = duration / intervalTime;
      let currentStep = 0;

      // Mark current story as viewed
      const currentStory = groupedStories[activeUserIndex].stories[activeStoryIndex];
      if (currentStory) {
        API.put(`/stories/${currentStory._id}/view`).catch(() => {});
      }

      progressInterval.current = setInterval(() => {
        currentStep++;
        setProgress((currentStep / steps) * 100);

        if (currentStep >= steps) {
          handleNextStory();
        }
      }, intervalTime);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [activeUserIndex, activeStoryIndex]);

  const handleNextStory = () => {
    if (activeUserIndex === null) return;

    const userStories = groupedStories[activeUserIndex].stories;
    if (activeStoryIndex < userStories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      // Move to next user
      if (activeUserIndex < groupedStories.length - 1) {
        setActiveUserIndex(activeUserIndex + 1);
        setActiveStoryIndex(0);
      } else {
        // End of all stories
        closeViewer();
      }
    }
  };

  const handlePrevStory = () => {
    if (activeUserIndex === null) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      // Move to previous user
      if (activeUserIndex > 0) {
        setActiveUserIndex(activeUserIndex - 1);
        setActiveStoryIndex(groupedStories[activeUserIndex - 1].stories.length - 1);
      } else {
        // Back to beginning
        setProgress(0);
      }
    }
  };

  const closeViewer = () => {
    setActiveUserIndex(null);
    setActiveStoryIndex(0);
    setProgress(0);
  };

  const openStoryViewer = (userIndex) => {
    setActiveUserIndex(userIndex);
    setActiveStoryIndex(0);
  };

  const currentStoriesGroup = activeUserIndex !== null ? groupedStories[activeUserIndex] : null;
  const currentStory = currentStoriesGroup ? currentStoriesGroup.stories[activeStoryIndex] : null;

  return (
    <div className="stories-wrapper">
      <div className="stories-tray">
        {/* Create Story Button */}
        <div className="story-item create-story-item" onClick={triggerUpload}>
          <div className="story-avatar-container">
            {user?.avatar ? (
              <img src={user.avatar} alt="Me" className="story-avatar" />
            ) : (
              <div className="story-avatar-placeholder">{user?.name?.charAt(0).toUpperCase()}</div>
            )}
            <div className="story-add-badge">
              <RiAddLine />
            </div>
          </div>
          <span className="story-username">Your Story</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Dynamic Story Circles */}
        {groupedStories.map((group, userIndex) => (
          <div
            key={group.user._id}
            className="story-item"
            onClick={() => openStoryViewer(userIndex)}
          >
            <div className="story-avatar-container active-ring">
              {group.user.avatar ? (
                <img src={group.user.avatar} alt={group.user.name} className="story-avatar" />
              ) : (
                <div className="story-avatar-placeholder">{group.user.name?.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <span className="story-username">{group.user.username}</span>
          </div>
        ))}
      </div>

      {/* Full Screen Story Modal */}
      {activeUserIndex !== null && currentStory && (
        <div className="story-viewer-modal" onClick={closeViewer}>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            {/* Progress Bars */}
            <div className="story-progress-container">
              {currentStoriesGroup.stories.map((s, idx) => (
                <div key={s._id} className="story-progress-bar-bg">
                  <div
                    className="story-progress-bar-fill"
                    style={{
                      width:
                        idx === activeStoryIndex
                          ? `${progress}%`
                          : idx < activeStoryIndex
                          ? '100%'
                          : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header info */}
            <div className="story-viewer-header">
              <div className="story-viewer-user">
                {currentStoriesGroup.user.avatar ? (
                  <img src={currentStoriesGroup.user.avatar} alt="" className="avatar avatar-sm" />
                ) : (
                  <div className="avatar-placeholder avatar-sm">
                    {currentStoriesGroup.user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="story-viewer-username">{currentStoriesGroup.user.username}</span>
              </div>
              <button className="story-viewer-close" onClick={closeViewer}>
                <RiCloseLine />
              </button>
            </div>

            {/* Media Body */}
            <div className="story-viewer-body">
              {currentStory.mediaType === 'video' ? (
                <video src={currentStory.mediaUrl} autoPlay playsInline className="story-media" />
              ) : (
                <img src={currentStory.mediaUrl} alt="" className="story-media" />
              )}
            </div>

            {/* Navigation buttons */}
            <button className="story-nav-btn prev" onClick={handlePrevStory}>
              <RiArrowLeftSLine />
            </button>
            <button className="story-nav-btn next" onClick={handleNextStory}>
              <RiArrowRightSLine />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
