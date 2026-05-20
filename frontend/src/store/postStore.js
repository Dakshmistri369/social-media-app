import { create } from 'zustand';
import API from '../utils/api';

const usePostStore = create((set, get) => ({
  feedPosts: [],
  explorePosts: [],
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchFeed: async (reset = false) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const page = reset ? 1 : get().page;
      const { data } = await API.get(`/posts/feed?page=${page}&limit=10`);
      set((state) => ({
        feedPosts: reset ? data.posts : [...state.feedPosts, ...data.posts],
        hasMore: data.pagination.page < data.pagination.pages,
        page: reset ? 2 : state.page + 1,
      }));
    } catch (err) {
      console.error('Feed fetch error', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchExplore: async (reset = false, tag = '') => {
    set({ isLoading: true });
    try {
      const page = reset ? 1 : get().page;
      const { data } = await API.get(`/posts/explore?page=${page}&limit=12${tag ? `&tag=${tag}` : ''}`);
      set((state) => ({
        explorePosts: reset ? data.posts : [...state.explorePosts, ...data.posts],
        hasMore: data.pagination.page < Math.ceil(data.pagination.total / 12),
        page: reset ? 2 : state.page + 1,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  addPost: (post) => set((state) => ({ feedPosts: [post, ...state.feedPosts] })),

  updatePost: (updatedPost) =>
    set((state) => ({
      feedPosts: state.feedPosts.map((p) => p._id === updatedPost._id ? updatedPost : p),
      explorePosts: state.explorePosts.map((p) => p._id === updatedPost._id ? updatedPost : p),
    })),

  removePost: (postId) =>
    set((state) => ({
      feedPosts: state.feedPosts.filter((p) => p._id !== postId),
      explorePosts: state.explorePosts.filter((p) => p._id !== postId),
    })),

  toggleLike: (postId, userId) =>
    set((state) => {
      const update = (posts) => posts.map((p) => {
        if (p._id !== postId) return p;
        const isLiked = p.likes.includes(userId);
        return {
          ...p,
          likes: isLiked ? p.likes.filter((id) => id !== userId) : [...p.likes, userId],
        };
      });
      return { feedPosts: update(state.feedPosts), explorePosts: update(state.explorePosts) };
    }),
}));

export default usePostStore;
