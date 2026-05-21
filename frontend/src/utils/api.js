import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// API base URL — NEVER call localhost in a production build.
// We detect production by checking if the page hostname is NOT localhost.
// This is 100% reliable: no env var needed, no build-time flag needed.
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTION_API = 'https://social-media-app-uq3l.vercel.app/api';
const LOCAL_API      = 'http://localhost:5000/api';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalhost ? LOCAL_API : PRODUCTION_API;

console.log('[API] baseURL =', BASE_URL); // visible in DevTools for debugging

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // using Bearer tokens, not cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — redirect to login except on auth pages
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRoute = ['/login', '/register'].some((p) =>
      window.location.pathname.startsWith(p)
    );
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
