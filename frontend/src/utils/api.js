import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// API base URL — NEVER call localhost in a production build.
// We detect production by checking if the page hostname is NOT localhost.
// This is 100% reliable: no env var needed, no build-time flag needed.
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTION_API = 'https://backend-three-navy-33.vercel.app/api';
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

export const SERVER_URL = isLocalhost ? 'http://localhost:5000' : 'https://backend-three-navy-33.vercel.app';

const normalizeAssets = (obj) => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/')) {
      return `${SERVER_URL}${obj}`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeAssets);
  }
  if (typeof obj === 'object') {
    if (
      (typeof File !== 'undefined' && obj instanceof File) ||
      (typeof Blob !== 'undefined' && obj instanceof Blob) ||
      obj instanceof Date ||
      obj.constructor?.name === 'FormData'
    ) {
      return obj;
    }
    const res = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = normalizeAssets(obj[key]);
      }
    }
    return res;
  }
  return obj;
};

// Global response interceptor for normalizations and 401 handling
API.interceptors.response.use(
  (res) => {
    if (res.data) {
      res.data = normalizeAssets(res.data);
    }
    return res;
  },
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
