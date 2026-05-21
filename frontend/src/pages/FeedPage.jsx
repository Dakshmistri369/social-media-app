import { useEffect, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import usePostStore from '../store/postStore';
import CreatePost from '../components/post/CreatePost';
import Stories from '../components/story/Stories';
import PostCard from '../components/post/PostCard';
import RightSidebar from '../components/sidebar/RightSidebar';
import './FeedPage.css';

export default function FeedPage() {
  const { feedPosts, isLoading, hasMore, fetchFeed, page } = usePostStore();
  const initialized = useRef(false);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchFeed(true);
    }
  }, []);

  useEffect(() => {
    if (inView && hasMore && !isLoading && initialized.current) {
      fetchFeed();
    }
  }, [inView]);

  return (
    <div className="feed-layout">
      <div className="feed-column">
        <CreatePost />
        <Stories />

        <div className="posts-list">
          {feedPosts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}

          {isLoading && (
            <div className="loading-posts">
              {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
            </div>
          )}

          {!isLoading && feedPosts.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">🌟</span>
              <h3>Your feed is empty</h3>
              <p>Follow some people or create your first post!</p>
            </div>
          )}

          {hasMore && <div ref={loadMoreRef} style={{ height: 20 }} />}

          {!hasMore && feedPosts.length > 0 && (
            <p className="feed-end">You're all caught up! 🎉</p>
          )}
        </div>
      </div>

      <RightSidebar />
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="post-skeleton card">
      <div style={{ display: 'flex', gap: 10, padding: 16 }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 12, width: '25%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 8, marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}
