import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import API from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Direct login (admin)
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await API.post('/auth/login', { email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true });
          return { success: true };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally {
          set({ isLoading: false });
        }
      },

      // Submit a login request that needs admin approval
      requestLogin: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await API.post('/auth/login-request', { email, password });
          // Admin accounts bypass the queue
          if (data.direct) {
            localStorage.setItem('token', data.token);
            set({ user: data.user, token: data.token, isAuthenticated: true });
            return { success: true, direct: true };
          }
          return { success: true, requestId: data.requestId };
        } catch (err) {
          const status = err.response?.status;
          // 404 means backend hasn't deployed the new route yet
          if (status === 404) {
            return {
              success: false,
              message: 'Backend is updating. Please wait 1–2 minutes and try again.',
            };
          }
          return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally {
          set({ isLoading: false });
        }
      },

      // Called once admin approves — receive token & user
      completeLogin: (token, user) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },

      register: async (username, email, password, name) => {
        set({ isLoading: true });
        try {
          const { data } = await API.post('/auth/register', { username, email, password, name });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true });
          return { success: true };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Registration failed' };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updatedUser) => set({ user: updatedUser }),

      fetchMe: async () => {
        try {
          const { data } = await API.get('/auth/me');
          set({ user: data.user });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
