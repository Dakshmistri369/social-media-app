import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  RiHeart3Line, RiHeart3Fill, RiChat3Line, RiRepeatLine,
  RiShareLine, RiArrowLeftLine, RiCheckboxCircleFill,
  RiBookmarkLine, RiBookmarkFill,
} from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import CommentSection from '../components/post/CommentSection';
import toast from 'react-hot-toast';
import './PostDetailPage.css';

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await API.get(`/posts/${id}`);
        setPost(data.post);
        setLiked(data.post.likes?.includes(user?._id));
        setLikeCount(data.post.likes?.length || 0);
      } catch {
        toast.error('Post not found');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      await API.put(`/posts/${id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  if (isLoading) return (
    <div className="post-detail-page">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" />
      </div>
    </div>
  );

  if (!post) return null;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const mediaCount = post.media?.length || 0;
  const gridClass = mediaCount === 1 ? 'grid-1' : mediaCount === 2 ? 'grid-2' : mediaCount === 3 ? 'grid-3' : 'grid-4';

  return (
    <div className="post-detail-page">
      <div className="post-detail-container">
        {/* Back button */}
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
          {post.content && (
            <p className="post-detail-content">{post.content}</p>
          )}

          {/* Media */}
          {mediaCount > 0 && (
            <div className={`media-grid ${gridClass}`} style={{ marginBottom: 16 }}>
              {post.media.slice(0, 4).map((m, i) => (
                m.type === 'video' ? (
                  <video key={i} src={m.url} className="media-item" controls playsInline />
                ) : (
                  <img key={i} src={m.url} alt="" className="media-item" />
                )
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="post-detail-stats">
            <span><strong>{likeCount}</strong> Likes</span>
            <span><strong>{post.comments?.length || 0}</strong> Comments</span>
            <span><strong>{post.viewCount || 0}</strong> Views</span>
          </div>

          {/* Actions */}
          <div className="post-detail-actions">
            <button className={`post-action-btn like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              {liked ? <RiHeart3Fill /> : <RiHeart3Line />}
              <span>{liked ? 'Liked' : 'Like'}</span>
            </button>
            <button className="post-action-btn comment-btn">
              <RiChat3Line /> <span>Comment</span>
            </button>
            <button
              className="post-action-btn share-btn"
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
            >
              <RiShareLine /> <span>Share</span>
            </button>
            <button
              className={`post-action-btn save-btn ${saved ? 'saved' : ''}`}
              onClick={async () => {
                setSaved(!saved);
                await API.post(`/posts/${id}/save`);
                toast.success(saved ? 'Removed from saved' : 'Saved!');
              }}
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
    </div>
  );
}
