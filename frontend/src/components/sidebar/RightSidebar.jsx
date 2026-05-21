import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiUserAddLine, RiCheckboxCircleFill, RiFireLine, RiArrowUpLine } from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import API from '../../utils/api';
import './RightSidebar.css';

const TRENDING = [
  { tag: '#javascript', posts: '12.4K' },
  { tag: '#react', posts: '8.1K' },
  { tag: '#webdev', posts: '6.7K' },
  { tag: '#ai', posts: '22.3K' },
  { tag: '#design', posts: '5.2K' },
  { tag: '#nodejs', posts: '4.8K' },
];

export default function RightSidebar() {
  const [suggestions, setSuggestions] = useState([]);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      API.get('/users/suggestions').then((res) => setSuggestions(res.data.users)).catch(() => {});
    }
  }, []);

  return (
    <aside className="right-sidebar">
      {/* Trending */}
      <div className="rs-card">
        <h3 className="rs-title">
          <RiFireLine className="rs-title-icon orange" /> Trending
        </h3>
        <div className="trending-list">
          {TRENDING.map((item, i) => (
            <button
              key={item.tag}
              className="trending-item"
              onClick={() => navigate(`/explore?tag=${encodeURIComponent(item.tag)}`)}
            >
              <div className="trend-rank">#{i + 1}</div>
              <div className="trend-info">
                <span className="trend-tag">{item.tag}</span>
                <span className="trend-count">{item.posts} posts</span>
              </div>
              <RiArrowUpLine className="trend-arrow" />
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rs-card">
          <h3 className="rs-title">
            <RiUserAddLine className="rs-title-icon purple" /> Who to follow
          </h3>
          <div className="suggestions-list">
            {suggestions.map((u) => (
              <SuggestionCard key={u._id} user={u} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="rs-footer">
        <p>© 2025 LinkUp</p>
        <p>Built with MERN Stack 🚀</p>
      </div>
    </aside>
  );
}

function SuggestionCard({ user }) {
  const [following, setFollowing] = useState(false);
  const navigate = useNavigate();

  const handleFollow = async (e) => {
    e.stopPropagation();
    setFollowing(!following);
    try { await API.put(`/users/${user._id}/follow`); } catch { setFollowing(following); }
  };

  return (
    <div className="suggestion-card" onClick={() => navigate(`/profile/${user.username}`)}>
      <div className="suggestion-user">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="avatar avatar-sm" />
        ) : (
          <div className="avatar-placeholder avatar-sm" style={{ fontSize: 13 }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="suggestion-info">
          <div className="suggestion-name">
            {user.name}
            {user.isVerified && <RiCheckboxCircleFill className="verified-icon" style={{ fontSize: 11 }} />}
          </div>
          <div className="suggestion-handle">@{user.username}</div>
        </div>
      </div>
      <button
        className={`btn btn-sm ${following ? 'btn-outline' : 'btn-primary'}`}
        onClick={handleFollow}
        style={{ padding: '5px 12px', fontSize: 12 }}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
