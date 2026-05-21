import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  RiNotification3Line, RiCheckLine, RiHeart3Fill,
  RiChat3Line, RiUserAddLine, RiRepeatLine,
  RiShieldCheckLine, RiCheckboxCircleLine, RiCloseLine,
} from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import './NotificationsPage.css';
import './LoginWaiting.css';

const ICON_MAP = {
  like:    <RiHeart3Fill    style={{ color: '#ef4444' }} />,
  comment: <RiChat3Line     style={{ color: '#3b82f6' }} />,
  follow:  <RiUserAddLine   style={{ color: '#10b981' }} />,
  repost:  <RiRepeatLine    style={{ color: '#10b981' }} />,
  reply:   <RiChat3Line     style={{ color: '#8b5cf6' }} />,
  mention: <RiNotification3Line style={{ color: '#eab308' }} />,
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(true);

  // Admin login requests
  const [loginRequests, setLoginRequests] = useState([]);
  const [lrLoading, setLrLoading]         = useState(false);

  const navigate = useNavigate();

  // Load normal notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await API.get('/notifications');
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {}
      finally { setIsLoading(false); }
    };
    fetchNotifications();
  }, []);

  // Admin: load pending login requests
  useEffect(() => {
    if (!isAdmin) return;
    const fetchRequests = async () => {
      setLrLoading(true);
      try {
        const { data } = await API.get('/auth/login-requests');
        setLoginRequests(data.requests);
      } catch {}
      finally { setLrLoading(false); }
    };
    fetchRequests();
    // Refresh every 15 seconds
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const markAllRead = async () => {
    await API.put('/notifications/read');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClick = (n) => {
    if (n.post) navigate(`/post/${n.post._id || n.post}`);
    else if (n.type === 'follow') navigate(`/profile/${n.sender?.username}`);
  };

  const handleApprove = async (id) => {
    try {
      await API.put(`/auth/login-requests/${id}/approve`);
      setLoginRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/auth/login-requests/${id}/reject`);
      setLoginRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  if (isLoading) return (
    <div className="notif-page">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" />
      </div>
    </div>
  );

  return (
    <div className="notif-page">
      <div className="notif-container">

        {/* ── Admin Login Requests Panel ───────────────────────────────── */}
        {isAdmin && (
          <div className="admin-requests-panel">
            <div className="admin-panel-title">
              <RiShieldCheckLine style={{ color: 'var(--accent)', fontSize: 20 }} />
              Pending Login Requests
              {loginRequests.length > 0 && (
                <span className="admin-panel-badge">{loginRequests.length}</span>
              )}
            </div>

            {lrLoading && loginRequests.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <div className="spinner" style={{ width: 22, height: 22 }} />
              </div>
            ) : loginRequests.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                No pending login requests 🎉
              </p>
            ) : (
              loginRequests.map((req) => (
                <div key={req._id} className="login-request-card">
                  <div className="lr-avatar">
                    {req.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="lr-info">
                    <div className="lr-name">
                    {req.name}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> @{req.username}</span>
                    <span style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 20,
                      background: req.type === 'register' ? 'rgba(124,92,255,0.18)' : 'rgba(16,185,129,0.15)',
                      color: req.type === 'register' ? 'var(--accent)' : '#10b981',
                    }}>
                      {req.type === 'register' ? 'Sign Up' : 'Sign In'}
                    </span>
                  </div>
                    <div className="lr-email">{req.email}</div>
                    <div className="lr-time">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="lr-actions">
                    <button
                      className="lr-approve-btn"
                      onClick={() => handleApprove(req._id)}
                      title="Approve login"
                    >
                      <RiCheckboxCircleLine /> Approve
                    </button>
                    <button
                      className="lr-reject-btn"
                      onClick={() => handleReject(req._id)}
                      title="Reject login"
                    >
                      <RiCloseLine />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Regular Notifications ────────────────────────────────────── */}
        <div className="notif-header">
          <div>
            <h1 className="notif-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge badge-purple">{unreadCount} new</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              <RiCheckLine /> Mark all read
            </button>
          )}
        </div>

        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <RiNotification3Line style={{ fontSize: 48, opacity: 0.3 }} />
              <h3>No notifications yet</h3>
              <p>When someone likes or comments on your posts, you'll see it here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-icon-wrap">
                  {n.sender?.avatar ? (
                    <img src={n.sender.avatar} alt={n.sender.name} className="avatar avatar-md" />
                  ) : (
                    <div className="avatar-placeholder avatar-md">
                      {n.sender?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="notif-type-icon">{ICON_MAP[n.type] || <RiNotification3Line />}</span>
                </div>

                <div className="notif-content">
                  <p>
                    <strong>{n.sender?.name}</strong>{' '}
                    {n.message?.replace(n.sender?.username ? n.sender.name : '', '').trim() || n.type}
                  </p>
                  {n.post?.content && (
                    <span className="notif-post-preview">
                      "{n.post.content.substring(0, 60)}{n.post.content.length > 60 ? '...' : ''}"
                    </span>
                  )}
                  <span className="notif-time">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {!n.isRead && <div className="unread-dot" />}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
