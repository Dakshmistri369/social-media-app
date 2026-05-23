import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  RiHeart3Line, RiHeart3Fill, RiChat3Line, RiRepeatLine,
  RiBookmarkLine, RiBookmarkFill, RiMore2Line, RiShareLine,
  RiCheckboxCircleFill, RiDeleteBin6Line, RiEdit2Line,
} from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import usePostStore from '../../store/postStore';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import './PostCard.css';

const reactionsMap = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
};

export default function PostCard({ post, onDelete }) {
  const { user, updateUser } = useAuthStore();
  const { removePost } = usePostStore();
  const [reactions, setReactions] = useState(post.reactions || []);
  const [showReactionsSelector, setShowReactionsSelector] = useState(false);
  const [poll, setPoll] = useState(post.poll);
  const [saved, setSaved] = useState(() => {
    if (!user || !user.savedPosts) return false;
    return user.savedPosts.some(id => (id?._id || id) === post._id);
  });
  const [showMenu, setShowMenu] = useState(false);
  const [reposted, setReposted] = useState(() => {
    if (!user || !post.shares) return false;
    const userId = user._id || user.id;
    return post.shares.some(id => (id?._id || id) === userId);
  });
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const hoverTimeoutRef = useRef(null);
  const pressTimeoutRef = useRef(null);
  const isPressingRef = useRef(false);
  const preventClickRef = useRef(false);

  // Sync saved and reposted states when user or post changes
  useEffect(() => {
    if (user) {
      const userId = user._id || user.id;
      setSaved(user.savedPosts ? user.savedPosts.some(id => (id?._id || id) === post._id) : false);
      setReposted(post.shares ? post.shares.some(id => (id?._id || id) === userId) : false);
    } else {
      setSaved(false);
      setReposted(false);
    }
  }, [user, post._id, post.shares]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    };
  }, []);

  // Close reactions selector when clicking outside
  useEffect(() => {
    if (!showReactionsSelector) return;
    const handleOutsideClose = (e) => {
      if (!e.target.closest('.reactions-container')) {
        setShowReactionsSelector(false);
      }
    };
    document.addEventListener('click', handleOutsideClose);
    document.addEventListener('touchstart', handleOutsideClose);
    return () => {
      document.removeEventListener('click', handleOutsideClose);
      document.removeEventListener('touchstart', handleOutsideClose);
    };
  }, [showReactionsSelector]);

  const handlePointerEnter = (e) => {
    if (e.pointerType === 'touch') return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowReactionsSelector(true);
    }, 150);
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === 'touch') return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowReactionsSelector(false);
    }, 250);
  };

  const handleTouchStart = () => {
    isPressingRef.current = true;
    preventClickRef.current = false;
    
    if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    pressTimeoutRef.current = setTimeout(() => {
      if (isPressingRef.current) {
        setShowReactionsSelector(true);
        preventClickRef.current = true;
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    }, 350);
  };

  const handleTouchEnd = () => {
    isPressingRef.current = false;
    if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (preventClickRef.current) {
      preventClickRef.current = false;
      return;
    }
    
    if (showReactionsSelector) {
      setShowReactionsSelector(false);
    } else {
      handleReact(myReaction || 'like');
    }
  };

  const isOwn = user?._id === post.author?._id;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const myReaction = reactions.find(r => {
    const reactionUserId = r.user?._id || r.user;
    const currentUserId = user?._id || user?.id;
    return reactionUserId && currentUserId && reactionUserId.toString() === currentUserId.toString();
  })?.type;

  const handleReact = async (type) => {
    if (!user) { navigate('/login'); return; }
    
    // Backup current reactions for rollback
    const previousReactions = [...reactions];
    
    // Determine the current user's ID
    const userId = user._id || user.id;
    
    // Find if the user has an existing reaction
    const existingIndex = reactions.findIndex(r => {
      const reactionUser = r.user?._id || r.user;
      return reactionUser?.toString() === userId?.toString();
    });

    let optimisticReactions = [];
    if (existingIndex > -1) {
      if (reactions[existingIndex].type === type) {
        // Clicking same emoji toggles it off
        optimisticReactions = reactions.filter((_, idx) => idx !== existingIndex);
      } else {
        // Change to another emoji type
        optimisticReactions = reactions.map((r, idx) =>
          idx === existingIndex ? { ...r, type } : r
        );
      }
    } else {
      // Add new reaction
      optimisticReactions = [...reactions, { user: userId, type }];
    }

    // Instantly update state for seamless responsive feel
    setReactions(optimisticReactions);
    setShowReactionsSelector(false);

    try {
      const { data } = await API.put(`/posts/${post._id}/react`, { type });
      setReactions(data.reactions);
    } catch {
      // Revert on failure
      setReactions(previousReactions);
      toast.error('Failed to react');
    }
  };

  const handlePollVote = async (optionId) => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await API.put(`/posts/${post._id}/poll/vote`, { optionId });
      setPoll(data.poll);
      toast.success('Vote updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Voting failed');
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    
    const wasSaved = saved;
    setSaved(!wasSaved);
    
    try {
      await API.post(`/posts/${post._id}/save`);
      if (user) {
        const updatedSavedPosts = wasSaved
          ? user.savedPosts.filter(id => (id?._id || id) !== post._id)
          : [...(user.savedPosts || []), post._id];
        updateUser({ ...user, savedPosts: updatedSavedPosts });
      }
      toast.success(wasSaved ? 'Removed from saved' : 'Post saved!');
    } catch {
      setSaved(wasSaved);
      toast.error('Failed to save post');
    }
  };

  const handleRepost = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    
    const wasReposted = reposted;
    setReposted(!wasReposted);
    
    try {
      const { data } = await API.post(`/posts/${post._id}/repost`);
      setReposted(data.isReposted);
      // Update local shares array on the post object to keep count in sync
      const userId = user._id || user.id;
      let newShares = [...(post.shares || [])];
      if (data.isReposted) {
        if (!newShares.includes(userId)) newShares.push(userId);
      } else {
        newShares = newShares.filter(id => id !== userId);
      }
      post.shares = newShares;
      toast.success(data.isReposted ? 'Reposted!' : 'Repost removed');
    } catch {
      setReposted(wasReposted);
      toast.error('Failed to repost');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await API.delete(`/posts/${post._id}`);
      removePost(post._id);
      onDelete?.(post._id);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete');
    }
    setShowMenu(false);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    toast.success('Link copied!');
  };

  const mediaCount = post.media?.length || 0;
  const gridClass = mediaCount === 1 ? 'grid-1' : mediaCount === 2 ? 'grid-2' : mediaCount === 3 ? 'grid-3' : 'grid-4';

  return (
    <article className="post-card fade-in" onClick={() => navigate(`/post/${post._id}`)}>
      {/* Repost banner */}
      {post.isRepost && (
        <div className="repost-banner">
          <RiRepeatLine /> Reposted
        </div>
      )}

      <div className="post-card-inner">
        {/* Author */}
        <div className="post-author">
          <Link
            to={`/profile/${post.author?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="post-author-link"
          >
            {post.author?.avatar ? (
              <img src={post.author.avatar} alt={post.author.name} className="avatar avatar-md" />
            ) : (
              <div className="avatar-placeholder avatar-md">
                {post.author?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="post-author-info">
              <div className="post-author-name">
                {post.author?.name}
                {post.author?.isVerified && <RiCheckboxCircleFill className="verified-icon" />}
              </div>
              <div className="post-author-handle">@{post.author?.username} · {timeAgo}</div>
            </div>
          </Link>

          {/* Menu */}
          <div className="post-menu-wrapper" onClick={(e) => e.stopPropagation()}>
            <button className="btn-icon post-menu-btn" onClick={() => setShowMenu(!showMenu)}>
              <RiMore2Line />
            </button>
            {showMenu && (
              <div className="post-menu">
                {isOwn && (
                  <>
                    <button className="post-menu-item danger" onClick={handleDelete}>
                      <RiDeleteBin6Line /> Delete
                    </button>
                  </>
                )}
                <button className="post-menu-item" onClick={handleShare}>
                  <RiShareLine /> Copy link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <p className="post-content">{renderContent(post.content)}</p>
        )}

        {/* Media */}
        {mediaCount > 0 && (
          <div className={`media-grid ${gridClass}`} onClick={(e) => e.stopPropagation()}>
            {post.media.slice(0, 4).map((m, i) => (
              m.type === 'video' ? (
                <video
                  key={i}
                  src={m.url}
                  className="media-item"
                  controls
                  playsInline
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img key={i} src={m.url} alt="" className="media-item" loading="lazy" />
              )
            ))}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags?.length > 0 && (
          <div className="post-hashtags">
            {post.hashtags.map((tag) => (
              <span key={tag} className="tag" onClick={(e) => { e.stopPropagation(); navigate(`/explore?tag=${tag}`); }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Poll */}
        {poll && poll.options && (
          <div className="post-poll-container" onClick={(e) => e.stopPropagation()}>
            <div className="poll-question">{poll.question}</div>
            <div className="poll-options">
              {poll.options.map((opt) => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                const isVoted = opt.votes.some(v => v === user?._id || v?._id === user?._id);
                const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                
                return (
                  <button
                    key={opt._id}
                    className={`poll-option-btn ${isVoted ? 'voted' : ''}`}
                    onClick={() => handlePollVote(opt._id)}
                  >
                    <div className="poll-option-fill" style={{ width: `${percentage}%` }} />
                    <span className="poll-option-text">{opt.optionText}</span>
                    <span className="poll-option-percentage">{percentage}% ({opt.votes.length})</span>
                  </button>
                );
              })}
            </div>
            {poll.expiresAt && (
              <div className="poll-footer">
                {new Date(poll.expiresAt) > new Date()
                  ? `Active · Ends ${new Date(poll.expiresAt).toLocaleDateString()}`
                  : 'Poll ended'}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="post-actions" onClick={(e) => e.stopPropagation()}>
          <div
            className="reactions-container"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            <button
              className={`post-action-btn react-btn ${myReaction ? 'reacted' : ''}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onClick={handleButtonClick}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="react-icon-display">
                {myReaction ? reactionsMap[myReaction] : <RiHeart3Line />}
              </span>
              <span>{reactions.length}</span>
            </button>

            {showReactionsSelector && (
              <div className="reactions-selector">
                {Object.entries(reactionsMap).map(([type, emoji]) => (
                  <button
                    key={type}
                    className={`reaction-emoji-btn ${myReaction === type ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact(type);
                    }}
                    title={type}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="post-action-btn comment-btn" onClick={() => navigate(`/post/${post._id}`)}>
            <RiChat3Line />
            <span>{post.comments?.length || 0}</span>
          </button>

          <button
            className={`post-action-btn repost-btn ${reposted ? 'reposted' : ''}`}
            onClick={handleRepost}
          >
            <RiRepeatLine />
            <span>{post.shares?.length || 0}</span>
          </button>

          <button className="post-action-btn share-btn" onClick={handleShare}>
            <RiShareLine />
          </button>

          <button
            className={`post-action-btn save-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
          >
            {saved ? <RiBookmarkFill /> : <RiBookmarkLine />}
          </button>
        </div>
      </div>
    </article>
  );
}

function renderContent(text) {
  const parts = text.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) return <span key={i} className="content-hashtag">{part}</span>;
    if (part.startsWith('@')) return <span key={i} className="content-mention">{part}</span>;
    return part;
  });
}
