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
      loginTime: null,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await API.post('/auth/login', { email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, loginTime: Date.now() });
          return { success: true };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (username, email, password, name) => {
        set({ isLoading: true });
        try {
          const { data } = await API.post('/auth/register', { username, email, password, name });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, loginTime: Date.now() });
          return { success: true };
        } catch (err) {
          return { success: false, message: err.response?.data?.message || 'Registration failed' };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, loginTime: null });
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
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated, loginTime: state.loginTime }),
    }
  )
);

export default useAuthStore;
