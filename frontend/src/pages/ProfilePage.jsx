import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RiCalendarLine, RiMapPinLine, RiLinkM, RiCheckboxCircleFill,
  RiArrowLeftLine, RiSettings3Line, RiLogoutBoxLine,
} from 'react-icons/ri';
import { formatDistanceToNow, format } from 'date-fns';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import PostCard from '../components/post/PostCard';
import EditProfileModal from '../components/profile/EditProfileModal';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const isOwn = currentUser?.username === username;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const [profileRes, postsRes] = await Promise.all([
          API.get(`/users/${username}`),
          API.get(`/users/${username}/posts`),
        ]);
        setProfile(profileRes.data.user);
        setPosts(postsRes.data.posts);
        setIsFollowing(profileRes.data.user.followers?.some((f) => f._id === currentUser?._id));
        setFollowCount(profileRes.data.user.followers?.length || 0);
      } catch {
        toast.error('User not found');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser) { navigate('/login'); return; }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowCount((c) => wasFollowing ? c - 1 : c + 1);
    try {
      await API.put(`/users/${profile._id}/follow`);
    } catch {
      setIsFollowing(wasFollowing);
      setFollowCount((c) => wasFollowing ? c + 1 : c - 1);
    }
  };

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="profile-page">
      {showEditModal && (
        <EditProfileModal
          user={profile}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            setProfile(updated);
            updateUser(updated);
            toast.success('Profile updated!');
          }}
        />
      )}

      <div className="profile-container">
        {/* Back */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          <RiArrowLeftLine /> Back
        </button>

        {/* Cover + Avatar */}
        <div className="profile-header card">
          <div className="profile-cover">
            {profile.coverImage ? (
              <img src={profile.coverImage} alt="Cover" className="cover-img" />
            ) : (
              <div className="cover-gradient" />
            )}
          </div>

          <div className="profile-info">
            <div className="profile-avatar-row">
              <div className="profile-avatar-wrap">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="avatar avatar-2xl profile-avatar" />
                ) : (
                  <div className="avatar-placeholder avatar-2xl profile-avatar" style={{ fontSize: 28 }}>
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-actions">
                {isOwn ? (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowEditModal(true)}>
                      <RiSettings3Line /> Edit Profile
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                      <RiLogoutBoxLine /> Logout
                    </button>
                  </>
                ) : (
                  <button
                    className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            <div className="profile-meta">
              <div className="profile-name-row">
                <h1 className="profile-name">{profile.name}</h1>
                {profile.isVerified && <RiCheckboxCircleFill className="verified-icon" style={{ fontSize: 20 }} />}
              </div>
              <p className="profile-username">@{profile.username}</p>

              {profile.bio && <p className="profile-bio">{profile.bio}</p>}

              <div className="profile-details">
                {profile.location && (
                  <span><RiMapPinLine /> {profile.location}</span>
                )}
                {profile.website && (
                  <a href={profile.website} className="profile-website" target="_blank" rel="noopener noreferrer">
                    <RiLinkM /> {profile.website.replace(/https?:\/\//, '')}
                  </a>
                )}
                <span>
                  <RiCalendarLine /> Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}
                </span>
              </div>

              <div className="profile-stats">
                <div className="profile-stat">
                  <strong>{profile.following?.length || 0}</strong>
                  <span>Following</span>
                </div>
                <div className="profile-stat">
                  <strong>{followCount}</strong>
                  <span>Followers</span>
                </div>
                <div className="profile-stat">
                  <strong>{posts.length}</strong>
                  <span>Posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`profile-tab ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
        </div>

        {/* Posts grid / list */}
        {activeTab === 'posts' && (
          <div className="profile-posts-list">
            {posts.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <h3>No posts yet</h3>
              </div>
            ) : (
              posts.map((post) => <PostCard key={post._id} post={post} />)
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="media-posts-grid">
            {posts.filter((p) => p.media?.length > 0).map((post) => (
              <div
                key={post._id}
                className="media-thumb"
                onClick={() => navigate(`/post/${post._id}`)}
              >
                {post.media[0].type === 'video' ? (
                  <video src={post.media[0].url} className="media-thumb-img" />
                ) : (
                  <img src={post.media[0].url} alt="" className="media-thumb-img" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
