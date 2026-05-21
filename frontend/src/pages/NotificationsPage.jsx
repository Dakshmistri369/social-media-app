import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { RiNotification3Line, RiCheckLine, RiHeart3Fill, RiChat3Line, RiUserAddLine, RiRepeatLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import './NotificationsPage.css';

const ICON_MAP = {
  like: <RiHeart3Fill style={{ color: '#ef4444' }} />,
  comment: <RiChat3Line style={{ color: '#3b82f6' }} />,
  follow: <RiUserAddLine style={{ color: '#10b981' }} />,
  repost: <RiRepeatLine style={{ color: '#10b981' }} />,
  reply: <RiChat3Line style={{ color: '#8b5cf6' }} />,
  mention: <RiNotification3Line style={{ color: '#eab308' }} />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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

  const markAllRead = async () => {
    await API.put('/notifications/read');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClick = (n) => {
    if (n.post) navigate(`/post/${n.post._id || n.post}`);
    else if (n.type === 'follow') navigate(`/profile/${n.sender?.username}`);
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
                    <strong>{n.sender?.name}</strong> {n.message?.replace(n.sender?.username ? n.sender.name : '', '').trim() || n.type}
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
