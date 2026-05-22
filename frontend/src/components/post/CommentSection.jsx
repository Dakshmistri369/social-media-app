import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { RiHeart3Line, RiHeart3Fill, RiReplyLine, RiCheckboxCircleFill, RiDeleteBin6Line } from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import API from '../../utils/api';
import { hasAbusiveLanguage } from '../../utils/badWordsFilter';
import toast from 'react-hot-toast';
import './CommentSection.css';

function Comment({ comment, postId, onReply, onDelete }) {
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(comment.likes?.includes(user?._id));
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [showReplies, setShowReplies] = useState(false);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      await API.put(`/comments/${comment._id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const isOwn = user?._id === comment.author?._id;

  return (
    <div className="comment">
      {comment.author?.avatar ? (
        <img src={comment.author.avatar} alt={comment.author.name} className="avatar avatar-sm" />
      ) : (
        <div className="avatar-placeholder avatar-sm" style={{ fontSize: 12 }}>
          {comment.author?.name?.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="comment-body">
        <div className="comment-bubble">
          <div className="comment-author">
            <Link to={`/profile/${comment.author?.username}`} className="comment-author-name">
              {comment.author?.name}
              {comment.author?.isVerified && <RiCheckboxCircleFill className="verified-icon" style={{ fontSize: 11 }} />}
            </Link>
            <span className="comment-handle">@{comment.author?.username}</span>
          </div>
          <p className="comment-content">{comment.content}</p>
        </div>

        <div className="comment-actions">
          <span className="comment-time">{timeAgo}</span>
          <button className={`comment-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
            {liked ? <RiHeart3Fill /> : <RiHeart3Line />}
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button className="comment-action-btn" onClick={() => onReply(comment)}>
            <RiReplyLine /> Reply
          </button>
          {isOwn && (
            <button className="comment-action-btn danger" onClick={() => onDelete(comment._id)}>
              <RiDeleteBin6Line />
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies?.length > 0 && (
          <div className="replies-section">
            <button className="show-replies-btn" onClick={() => setShowReplies(!showReplies)}>
              {showReplies ? 'Hide' : `View ${comment.replies.length}`} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
            {showReplies && (
              <div className="replies-list">
                {comment.replies.map((reply) => (
                  <Comment
                    key={reply._id}
                    comment={reply}
                    postId={postId}
                    onReply={onReply}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentSection({ postId }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchComments = async () => {
    if (fetched) return;
    try {
      const { data } = await API.get(`/comments/post/${postId}`);
      setComments(data.comments);
      setFetched(true);
    } catch {}
  };

  useState(() => { fetchComments(); }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Block comments containing abusive language
    if (hasAbusiveLanguage(newComment)) {
      toast.error('Comment contains abusive, profane, or inappropriate language.');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await API.post(`/comments/post/${postId}`, {
        content: newComment.trim(),
        parentComment: replyingTo?._id || null,
      });
      if (replyingTo) {
        setComments((prev) => prev.map((c) =>
          c._id === replyingTo._id
            ? { ...c, replies: [...(c.replies || []), data.comment] }
            : c
        ));
      } else {
        setComments((prev) => [data.comment, ...prev]);
      }
      setNewComment('');
      setReplyingTo(null);
    } catch {
      toast.error('Failed to comment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await API.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="comment-section">
      {/* Input */}
      {user && (
        <form className="comment-form" onSubmit={handleSubmit}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="avatar avatar-sm" />
          ) : (
            <div className="avatar-placeholder avatar-sm" style={{ fontSize: 12 }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="comment-input-wrapper">
            {replyingTo && (
              <div className="replying-to">
                Replying to @{replyingTo.author?.username}
                <button type="button" onClick={() => setReplyingTo(null)}>✕</button>
              </div>
            )}
            <input
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? `Reply to @${replyingTo.author?.username}...` : 'Write a comment...'}
              maxLength={1000}
            />
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={isLoading || !newComment.trim()}
            >
              {isLoading ? '...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="comments-list">
        {comments.length === 0 && (
          <div className="empty-state" style={{ padding: '30px' }}>
            <RiHeart3Line style={{ fontSize: 32, opacity: 0.3 }} />
            <p>No comments yet. Be first!</p>
          </div>
        )}
        {comments.map((comment) => (
          <Comment
            key={comment._id}
            comment={comment}
            postId={postId}
            onReply={setReplyingTo}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
