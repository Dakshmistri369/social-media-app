import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate('/');
      toast.success('Welcome back! 👋');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb orb1" />
      <div className="auth-bg-orb orb2" />
      <div className="auth-bg-orb orb3" />

      <div className="auth-card scale-in">
        <div className="auth-logo">
          <img src="/linkup-logo.svg" alt="LinkUp" className="auth-logo-img" />
          <h1 className="auth-title gradient-text">LinkUp</h1>
        </div>
        <p className="auth-subtitle">Welcome back! Sign in to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
            {isLoading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-link-text">
          Don't have an account? <Link to="/register" className="auth-link">Sign up</Link>
        </p>

        {/* Demo hint */}
        <div className="demo-hint">
          <p>Demo: Create an account to get started!</p>
        </div>
      </div>
    </div>
  );
}
