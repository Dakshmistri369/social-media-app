import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  RiHeart3Line, RiChat3Line, RiShareLine, RiArrowLeftLine,
  RiCheckboxCircleFill, RiBookmarkLine, RiBookmarkFill, RiRepeatLine,
} from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import CommentSection from '../components/post/CommentSection';
import toast from 'react-hot-toast';
import './PostDetailPage.css';

const reactionsMap = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow:  '😮',
  sad:  '😢',
  angry:'😡',
};

export default function PostDetailPage() {
  const { id }       = useParams();
  const { user, updateUser } = useAuthStore();
  const navigate     = useNavigate();

  const [post, setPost]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reactions, setReactions] = useState([]);
  const [saved, setSaved]         = useState(false);
  const [reposted, setReposted]   = useState(false);

  // Emoji picker state
  const [showPicker, setShowPicker]     = useState(false);
  const [pickerPos,  setPickerPos]      = useState({ top: 0, left: 0 });
  const reactBtnRef   = useRef(null);
  const hoverTimeout  = useRef(null);
  const pressTimeout  = useRef(null);
  const isPressingRef = useRef(false);
  const preventClick  = useRef(false);

  /* ── Fetch post ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get(`/posts/${id}`);
        const p = data.post;
        setPost(p);
        setReactions(p.reactions || []);
        if (user) {
          setSaved(user.savedPosts?.some(s => (s?._id || s) === p._id) ?? false);
          const uid = user._id || user.id;
          setReposted(p.shares?.some(s => (s?._id || s) === uid) ?? false);
        }
      } catch {
        toast.error('Post not found');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  /* ── Close picker on outside click / scroll ── */
  useEffect(() => {
    if (!showPicker) return;
    const close = (e) => {
      if (!e.target.closest('.pd-reactions-container') && !e.target.closest('.reactions-selector'))
        setShowPicker(false);
    };
    const onScroll = () => setShowPicker(false);
    document.addEventListener('click',      close);
    document.addEventListener('touchstart', close);
    window.addEventListener('scroll',       onScroll, true);
    return () => {
      document.removeEventListener('click',      close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('scroll',       onScroll, true);
    };
  }, [showPicker]);

  /* ── Cleanup timeouts ── */
  useEffect(() => () => {
    clearTimeout(hoverTimeout.current);
    clearTimeout(pressTimeout.current);
  }, []);

  /* ── Picker position helper ── */
  const openPicker = () => {
    if (!reactBtnRef.current) { setShowPicker(true); return; }
    const rect      = reactBtnRef.current.getBoundingClientRect();
    const PICKER_H  = 52;
    const PICKER_W  = 290;
    const GAP       = 8;
    const top  = rect.top >= PICKER_H + GAP
      ? rect.top  - PICKER_H - GAP   // above
      : rect.bottom + GAP;            // below
    const idealLeft = rect.left + rect.width / 2 - PICKER_W / 2;
    const left = Math.min(Math.max(idealLeft, GAP), window.innerWidth - PICKER_W - GAP);
    setPickerPos({ top, left });
    setShowPicker(true);
  };
  const closePicker = () => setShowPicker(false);

  /* ── Desktop hover handlers ── */
  const onPointerEnter = (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(openPicker, 150);
  };
  const onPointerLeave = (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(closePicker, 250);
  };
  const onSelectorEnter = () => clearTimeout(hoverTimeout.current);
  const onSelectorLeave = () => {
    clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(closePicker, 200);
  };

  /* ── Mobile long-press handlers ── */
  const onTouchStart = () => {
    isPressingRef.current = true;
    preventClick.current  = false;
    clearTimeout(pressTimeout.current);
    pressTimeout.current = setTimeout(() => {
      if (isPressingRef.current) {
        openPicker();
        preventClick.current = true;
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }, 350);
  };
  const onTouchEnd = () => {
    isPressingRef.current = false;
    clearTimeout(pressTimeout.current);
  };

  /* ── React button click ── */
  const onReactBtnClick = (e) => {
    e.stopPropagation();
    if (preventClick.current) { preventClick.current = false; return; }
    if (showPicker) { closePicker(); }
    else            { handleReact(myReaction || 'like'); }
  };

  /* ── Apply reaction ── */
  const myReaction = reactions.find(r => {
    const ru  = r.user?._id || r.user;
    const uid = user?._id   || user?.id;
    return ru && uid && ru.toString() === uid.toString();
  })?.type;

  const handleReact = async (type) => {
    if (!user) { navigate('/login'); return; }
    const uid   = user._id || user.id;
    const prev  = [...reactions];
    const idx   = reactions.findIndex(r => (r.user?._id || r.user)?.toString() === uid?.toString());
    let next;
    if (idx > -1) {
      next = reactions[idx].type === type
        ? reactions.filter((_, i) => i !== idx)
        : reactions.map((r, i) => i === idx ? { ...r, type } : r);
    } else {
      next = [...reactions, { user: uid, type }];
    }
    setReactions(next);
    setShowPicker(false);
    try {
      const { data } = await API.put(`/posts/${id}/react`, { type });
      setReactions(data.reactions);
    } catch {
      setReactions(prev);
      toast.error('Failed to react');
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    const was = saved;
    setSaved(!was);
    try {
      await API.post(`/posts/${id}/save`);
      if (user) {
        const updated = was
          ? user.savedPosts.filter(s => (s?._id || s) !== id)
          : [...(user.savedPosts || []), id];
        updateUser({ ...user, savedPosts: updated });
      }
      toast.success(was ? 'Removed from saved' : 'Saved!');
    } catch {
      setSaved(was);
      toast.error('Failed to save');
    }
  };

  /* ── Repost ── */
  const handleRepost = async () => {
    if (!user) { navigate('/login'); return; }
    const was = reposted;
    setReposted(!was);
    try {
      const { data } = await API.post(`/posts/${id}/repost`);
      setReposted(data.isReposted);
      toast.success(data.isReposted ? 'Reposted!' : 'Repost removed');
    } catch {
      setReposted(was);
      toast.error('Failed to repost');
    }
  };

  /* ── Share ── */
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  /* ── Render ── */
  if (isLoading) return (
    <div className="post-detail-page">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" />
      </div>
    </div>
  );
  if (!post) return null;

  const timeAgo    = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const mediaCount = post.media?.length || 0;
  const gridClass  = mediaCount === 1 ? 'grid-1' : mediaCount === 2 ? 'grid-2' : mediaCount === 3 ? 'grid-3' : 'grid-4';

  return (
    <div className="post-detail-page">
      <div className="post-detail-container">
        {/* Back */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          <RiArrowLeftLine /> Back
        </button>

        <article className="post-detail-card card">
          {/* Author */}
          <div className="post-detail-header">
            <div className="post-author" onClick={() => navigate(`/profile/${post.author?.username}`)}>
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} className="avatar avatar-lg" />
              ) : (
                <div className="avatar-placeholder avatar-lg">
                  {post.author?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="post-author-name">
                  {post.author?.name}
                  {post.author?.isVerified && <RiCheckboxCircleFill className="verified-icon" />}
                </div>
                <div className="post-author-handle">@{post.author?.username} · {timeAgo}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          {post.content && <p className="post-detail-content">{post.content}</p>}

          {/* Media */}
          {mediaCount > 0 && (
            <div className={`media-grid ${gridClass}`} style={{ marginBottom: 16 }}>
              {post.media.slice(0, 4).map((m, i) =>
                m.type === 'video'
                  ? <video key={i} src={m.url} className="media-item" controls playsInline />
                  : <img   key={i} src={m.url} alt="" className="media-item" />
              )}
            </div>
          )}

          {/* Stats */}
          <div className="post-detail-stats">
            <span><strong>{reactions.length}</strong> Reactions</span>
            <span><strong>{post.comments?.length || 0}</strong> Comments</span>
            <span><strong>{post.viewCount || 0}</strong> Views</span>
          </div>

          {/* Actions */}
          <div className="post-detail-actions">

            {/* ── Emoji React button ── */}
            <div
              className="pd-reactions-container"
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              <button
                ref={reactBtnRef}
                className={`post-action-btn pd-react-btn ${myReaction ? 'liked' : ''}`}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onTouchCancel={onTouchEnd}
                onClick={onReactBtnClick}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className="pd-react-icon">
                  {myReaction ? reactionsMap[myReaction] : <RiHeart3Line />}
                </span>
                <span>{myReaction
                  ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1)
                  : 'Like'}
                </span>
              </button>
            </div>

            <button className="post-action-btn comment-btn">
              <RiChat3Line /> <span>Comment</span>
            </button>

            <button className="post-action-btn share-btn" onClick={handleShare}>
              <RiShareLine /> <span>Share</span>
            </button>

            <button
              className={`post-action-btn repost-btn ${reposted ? 'reposted' : ''}`}
              onClick={handleRepost}
            >
              <RiRepeatLine /> <span>{reposted ? 'Reposted' : 'Repost'}</span>
            </button>

            <button
              className={`post-action-btn save-btn ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              style={{ marginLeft: 'auto' }}
            >
              {saved ? <RiBookmarkFill /> : <RiBookmarkLine />}
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          {/* Comments */}
          <div className="post-detail-comments">
            <h3 className="comments-title">Comments</h3>
            <CommentSection postId={post._id} />
          </div>
        </article>
      </div>

      {/* Portal: emoji picker at document.body — escapes all clipping contexts */}
      {showPicker && createPortal(
        <div
          className="reactions-selector"
          style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left }}
          onPointerEnter={onSelectorEnter}
          onPointerLeave={onSelectorLeave}
        >
          {Object.entries(reactionsMap).map(([type, emoji]) => (
            <button
              key={type}
              className={`reaction-emoji-btn ${myReaction === type ? 'active' : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); handleReact(type); }}
              title={type}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
