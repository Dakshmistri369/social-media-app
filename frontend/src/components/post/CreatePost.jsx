import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  RiImageLine, RiVideoLine, RiCloseLine, RiSendPlane2Fill,
  RiGlobalLine, RiLockLine, RiGroupLine,
} from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import usePostStore from '../../store/postStore';
import API from '../../utils/api';
import { compressImage } from '../../utils/imageCompressor';
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

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Write something or add media!');
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

      const { data } = await API.post('/posts', {
        content: content.trim(),
        media: uploadedMedia,
        visibility,
      });

      addPost(data.post);
      setContent('');
      setMediaFiles([]);
      setPreviews([]);
      setFocused(false);
      toast.success('Post published! 🚀');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setIsLoading(false);
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
