import { useState, useEffect } from 'react';
import { RiBookmarkLine } from 'react-icons/ri';
import API from '../utils/api';
import PostCard from '../components/post/PostCard';

export default function SavedPage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const { data } = await API.get('/users/saved');
        setPosts(data.posts);
      } catch {}
      finally { setIsLoading(false); }
    };
    fetchSaved();
  }, []);

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Saved Posts</h1>
      {posts.length === 0 ? (
        <div className="empty-state">
          <RiBookmarkLine style={{ fontSize: 48, opacity: 0.3 }} />
          <h3>No saved posts</h3>
          <p>Save posts to read them later</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post) => <PostCard key={post._id} post={post} />)}
        </div>
      )}
    </div>
  );
}
