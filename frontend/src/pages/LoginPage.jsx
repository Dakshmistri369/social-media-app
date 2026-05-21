import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine, RiShieldCheckLine, RiCloseLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import toast from 'react-hot-toast';
import './AuthPages.css';
import './LoginWaiting.css';

export default function LoginPage() {
  const { requestLogin, completeLogin, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  // Approval flow state
  const [waitingRequestId, setWaitingRequestId] = useState(null);
  const [waitingStatus, setWaitingStatus]       = useState('pending'); // pending | approved | rejected
  const pollRef = useRef(null);

  // Start polling once we have a requestId
  useEffect(() => {
    if (!waitingRequestId) return;

    const poll = async () => {
      try {
        const { data } = await API.get(`/auth/login-requests/${waitingRequestId}/status`);
        if (data.status === 'approved') {
          clearInterval(pollRef.current);
          setWaitingStatus('approved');
          completeLogin(data.token, data.user);
          toast.success('Access granted! Welcome back 👋');
          navigate('/');
        } else if (data.status === 'rejected') {
          clearInterval(pollRef.current);
          setWaitingStatus('rejected');
        }
      } catch {
        // silently ignore network errors during poll
      }
    };

    pollRef.current = setInterval(poll, 3000);
    poll(); // immediate first check
    return () => clearInterval(pollRef.current);
  }, [waitingRequestId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await requestLogin(form.email, form.password);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    if (result.direct) {
      // Admin bypass — already logged in
      toast.success('Welcome back, Admin! 👋');
      navigate('/');
      return;
    }

    // Regular user — enter waiting room
    setWaitingRequestId(result.requestId);
    toast('Login request sent. Waiting for admin approval…', { icon: '🔐' });
  };

  const handleCancelRequest = () => {
    clearInterval(pollRef.current);
    setWaitingRequestId(null);
    setWaitingStatus('pending');
  };

  // ── Waiting / Rejected screens ───────────────────────────────────────────
  if (waitingRequestId) {
    return (
      <div className="auth-page">
        <div className="auth-bg-orb orb1" />
        <div className="auth-bg-orb orb2" />
        <div className="auth-bg-orb orb3" />

        <div className="auth-card scale-in waiting-card">
          {waitingStatus === 'rejected' ? (
            // Rejected
            <>
              <div className="waiting-icon rejected-icon">
                <RiCloseLine />
              </div>
              <h2 className="waiting-title">Access Denied</h2>
              <p className="waiting-desc">
                The admin rejected your login request. Please contact the admin if you think this is a mistake.
              </p>
              <button
                className="btn btn-outline"
                style={{ marginTop: 16 }}
                onClick={handleCancelRequest}
              >
                Try Again
              </button>
            </>
          ) : (
            // Pending
            <>
              <div className="waiting-icon">
                <RiShieldCheckLine />
              </div>
              <h2 className="waiting-title">Waiting for Approval</h2>
              <p className="waiting-desc">
                Your login request has been sent to the admin. You'll be automatically redirected once approved.
              </p>

              <div className="waiting-dots">
                <span /><span /><span />
              </div>

              <div className="waiting-user-info">
                <span className="waiting-email">{form.email}</span>
              </div>

              <button
                className="btn btn-ghost btn-sm cancel-wait-btn"
                onClick={handleCancelRequest}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Normal login form ────────────────────────────────────────────────────
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
            {isLoading
              ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : 'Request Login'}
          </button>
        </form>

        <p className="auth-link-text">
          Don't have an account? <Link to="/register" className="auth-link">Sign up</Link>
        </p>

        <div className="login-approval-notice">
          <RiShieldCheckLine className="notice-icon" />
          <span>Login requests require admin approval</span>
        </div>
      </div>
    </div>
  );
}
