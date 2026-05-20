import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { RiSearchLine, RiFireLine, RiHashtag } from 'react-icons/ri';
import PostCard from '../components/post/PostCard';
import usePostStore from '../store/postStore';
import API from '../utils/api';
import './ExplorePage.css';

const TRENDING_TAGS = ['#javascript', '#react', '#webdev', '#ai', '#design', '#coding', '#mern', '#nodejs', '#tech', '#programming'];

export default function ExplorePage() {
  const { explorePosts, fetchExplore, isLoading, hasMore } = usePostStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [activeTag, setActiveTag] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const initialized = useRef(false);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });
  const searchDebounce = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tag = params.get('tag') || '';
    setActiveTag(tag);
    fetchExplore(true, tag);
    initialized.current = true;
  }, [location.search]);

  useEffect(() => {
    if (inView && hasMore && !isLoading && initialized.current) fetchExplore(false, activeTag);
  }, [inView]);

  const handleSearch = (q) => {
    setSearchQuery(q);
    clearTimeout(searchDebounce.current);
    if (!q.trim()) { setSearchResults([]); setUserResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [postsRes, usersRes] = await Promise.all([
          API.get(`/posts/search?q=${encodeURIComponent(q)}`),
          API.get(`/users/search?q=${encodeURIComponent(q)}`),
        ]);
        setSearchResults(postsRes.data.posts);
        setUserResults(usersRes.data.users);
      } catch {}
      finally { setIsSearching(false); }
    }, 400);
  };

  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className="explore-layout">
      <div className="explore-column">
        {/* Search */}
        <div className="explore-search-wrap">
          <div className="explore-search">
            <RiSearchLine className="search-icon" />
            <input
              className="search-input"
              placeholder="Search posts, users, hashtags..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {isSearching && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
          </div>
        </div>

        {/* Trending Tags */}
        {!isSearchMode && (
          <div className="trending-tags">
            <div className="trending-header">
              <RiFireLine className="trend-icon" /> Trending
            </div>
            <div className="tags-scroll">
              <button
                className={`tag ${!activeTag ? 'active-tag' : ''}`}
                onClick={() => { setActiveTag(''); fetchExplore(true, ''); }}
              >
                All
              </button>
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  className={`tag ${activeTag === tag ? 'active-tag' : ''}`}
                  onClick={() => { setActiveTag(tag); fetchExplore(true, tag); }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {isSearchMode ? (
          <div className="search-results">
            {userResults.length > 0 && (
              <div className="search-section">
                <h3 className="search-section-title">People</h3>
                {userResults.map((u) => (
                  <UserSearchCard key={u._id} user={u} />
                ))}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="search-section">
                <h3 className="search-section-title">Posts</h3>
                {searchResults.map((post) => <PostCard key={post._id} post={post} />)}
              </div>
            )}

            {!isSearching && userResults.length === 0 && searchResults.length === 0 && (
              <div className="empty-state">
                <RiSearchLine style={{ fontSize: 40, opacity: 0.3 }} />
                <p>No results for "{searchQuery}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="explore-posts">
            <div className="explore-grid">
              {explorePosts.map((post) => (
                post.media?.length > 0 ? (
                  <ExploreMediaCard key={post._id} post={post} />
                ) : (
                  <div key={post._id} className="explore-text-post">
                    <PostCard post={post} />
                  </div>
                )
              ))}
            </div>

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div className="spinner spinner-lg" />
              </div>
            )}

            {!isLoading && explorePosts.length === 0 && (
              <div className="empty-state">
                <RiHashtag style={{ fontSize: 40, opacity: 0.3 }} />
                <p>No posts found</p>
              </div>
            )}

            {hasMore && <div ref={loadMoreRef} style={{ height: 20 }} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ExploreMediaCard({ post }) {
  const navigate = (path) => window.location.assign(path);
  return (
    <div className="explore-media-card" onClick={() => window.location.assign(`/post/${post._id}`)}>
      {post.media[0].type === 'video' ? (
        <video src={post.media[0].url} className="explore-media" />
      ) : (
        <img src={post.media[0].url} alt="" className="explore-media" loading="lazy" />
      )}
      <div className="explore-media-overlay">
        <span>❤️ {post.likes?.length || 0}</span>
        <span>💬 {post.comments?.length || 0}</span>
      </div>
    </div>
  );
}

function UserSearchCard({ user }) {
  return (
    <a href={`/profile/${user.username}`} className="user-search-card">
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="avatar avatar-md" />
      ) : (
        <div className="avatar-placeholder avatar-md">{user.name?.charAt(0).toUpperCase()}</div>
      )}
      <div className="user-search-info">
        <strong>{user.name}</strong>
        <span>@{user.username}</span>
        {user.bio && <p>{user.bio.substring(0, 60)}...</p>}
      </div>
      <span className="user-follower-count">{user.followers?.length || 0} followers</span>
    </a>
  );
}
