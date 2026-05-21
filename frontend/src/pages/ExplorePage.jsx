import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { RiSearchLine, RiFireLine, RiHashtag } from 'react-icons/ri';
import PostCard from '../components/post/PostCard';
import usePostStore from '../store/postStore';
import API from '../utils/api';
import './ExplorePage.css';

const TRENDING_TAGS = [
  {
    tag: '#javascript',
    image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=320&q=80',
    desc: 'The language of the web',
  },
  {
    tag: '#react',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=320&q=80',
    desc: 'Build UIs with components',
  },
  {
    tag: '#webdev',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=320&q=80',
    desc: 'Crafting the modern web',
  },
  {
    tag: '#ai',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=320&q=80',
    desc: 'Artificial Intelligence & ML',
  },
  {
    tag: '#design',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=320&q=80',
    desc: 'Beautiful UI & UX design',
  },
  {
    tag: '#coding',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=320&q=80',
    desc: 'Write code, change the world',
  },
  {
    tag: '#mern',
    image: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=320&q=80',
    desc: 'MongoDB, Express, React, Node',
  },
  {
    tag: '#nodejs',
    image: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=320&q=80',
    desc: 'Server-side JavaScript',
  },
  {
    tag: '#tech',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=320&q=80',
    desc: 'The future is tech',
  },
  {
    tag: '#programming',
    image: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=320&q=80',
    desc: 'Code is poetry',
  },
];

export default function ExplorePage() {
  const { explorePosts, fetchExplore, isLoading, hasMore } = usePostStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [activeTag, setActiveTag] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [previewTag, setPreviewTag] = useState(null); // { tag, image, desc, rect }
  const location = useLocation();
  const initialized = useRef(false);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });
  const searchDebounce = useRef(null);
  const previewTimeout = useRef(null);

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

  // Dismiss preview on outside click
  useEffect(() => {
    if (!previewTag) return;
    const dismiss = (e) => {
      if (!e.target.closest('.tag-preview-popup') && !e.target.closest('.tag')) {
        setPreviewTag(null);
      }
    };
    document.addEventListener('click', dismiss);
    document.addEventListener('touchstart', dismiss);
    return () => {
      document.removeEventListener('click', dismiss);
      document.removeEventListener('touchstart', dismiss);
    };
  }, [previewTag]);

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

  const showPreview = (item, el) => {
    clearTimeout(previewTimeout.current);
    const rect = el.getBoundingClientRect();
    setPreviewTag({ ...item, rect });
  };

  const hidePreview = () => {
    previewTimeout.current = setTimeout(() => setPreviewTag(null), 200);
  };

  const stayPreview = () => {
    clearTimeout(previewTimeout.current);
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
              {TRENDING_TAGS.map((item) => (
                <button
                  key={item.tag}
                  className={`tag ${activeTag === item.tag ? 'active-tag' : ''}`}
                  onClick={() => { setActiveTag(item.tag); fetchExplore(true, item.tag); }}
                  onMouseEnter={(e) => showPreview(item, e.currentTarget)}
                  onMouseLeave={hidePreview}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    showPreview(item, e.currentTarget);
                  }}
                >
                  {item.tag}
                </button>
              ))}
            </div>

            {/* Tag Preview Popup */}
            {previewTag && (
              <div
                className="tag-preview-popup"
                onMouseEnter={stayPreview}
                onMouseLeave={hidePreview}
              >
                <img
                  src={previewTag.image}
                  alt={previewTag.tag}
                  className="tag-preview-img"
                />
                <div className="tag-preview-body">
                  <span className="tag-preview-name">{previewTag.tag}</span>
                  <span className="tag-preview-desc">{previewTag.desc}</span>
                </div>
              </div>
            )}
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
