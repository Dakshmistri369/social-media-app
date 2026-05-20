import axios from 'axios';

// In production (Vercel), VITE_API_URL must be set in the Vercel dashboard.
// Fallback covers local dev. Production fallback points to deployed backend.
const PROD_API = 'https://social-media-app-t73o.vercel.app/api';
const DEV_API  = 'http://localhost:5000/api';

const BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? DEV_API : PROD_API);

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // using Bearer tokens, not cookies — no need for credentials
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRoute = ['/login', '/register'].some(p =>
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
