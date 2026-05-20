import { useState, useRef } from 'react';
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

export default function PostCard({ post, onDelete }) {
  const { user } = useAuthStore();
  const { toggleLike, removePost } = usePostStore();
  const [liked, setLiked] = useState(post.likes?.includes(user?._id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [reposted, setReposted] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const isOwn = user?._id === post.author?._id;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 350);
    toggleLike(post._id, user._id);
    try {
      await API.put(`/posts/${post._id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    setSaved(!saved);
    try {
      await API.post(`/posts/${post._id}/save`);
      toast.success(saved ? 'Removed from saved' : 'Post saved!');
    } catch {
      setSaved(saved);
    }
  };

  const handleRepost = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await API.post(`/posts/${post._id}/repost`);
      setReposted(data.isReposted);
      toast.success(data.isReposted ? 'Reposted!' : 'Repost removed');
    } catch {
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

        {/* Actions */}
        <div className="post-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`post-action-btn like-btn ${liked ? 'liked' : ''} ${likeAnim ? 'liked-anim' : ''}`}
            onClick={handleLike}
          >
            {liked ? <RiHeart3Fill /> : <RiHeart3Line />}
            <span>{likeCount}</span>
          </button>

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
