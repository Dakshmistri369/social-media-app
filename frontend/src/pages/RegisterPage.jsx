import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine, RiShieldCheckLine, RiCloseLine, RiUserAddLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import toast from 'react-hot-toast';
import './AuthPages.css';
import './LoginWaiting.css';

export default function RegisterPage() {
  const { requestRegister, completeLogin, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  // Approval flow state
  const [waitingRequestId, setWaitingRequestId] = useState(null);
  const [waitingStatus, setWaitingStatus]       = useState('pending');
  const pollRef = useRef(null);

  // Poll for approval once we have a requestId
  useEffect(() => {
    if (!waitingRequestId) return;

    const poll = async () => {
      try {
        const { data } = await API.get(`/auth/login-requests/${waitingRequestId}/status`);
        if (data.status === 'approved') {
          clearInterval(pollRef.current);
          setWaitingStatus('approved');
          completeLogin(data.token, data.user);
          toast.success('Account approved! Welcome to LinkUp 🚀');
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
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    const result = await requestRegister(form.username, form.email, form.password, form.name);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    if (result.direct) {
      // Fallback: backend not updated, direct register completed
      toast.success('Account created! Welcome to LinkUp 🚀');
      navigate('/');
      return;
    }

    // Enter waiting room
    setWaitingRequestId(result.requestId);
    toast('Sign-up request sent. Waiting for admin approval…', { icon: '🔐' });
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
              <h2 className="waiting-title">Registration Denied</h2>
              <p className="waiting-desc">
                The admin rejected your registration request. Contact the admin if you think this is a mistake.
              </p>
              <button
                className="btn btn-outline"
                style={{ marginTop: 16 }}
                onClick={handleCancelRequest}
              >
                Go Back
              </button>
            </>
          ) : (
            // Pending
            <>
              <div className="waiting-icon">
                <RiUserAddLine />
              </div>
              <h2 className="waiting-title">Pending Approval</h2>
              <p className="waiting-desc">
                Your account has been created. The admin needs to approve it before you can start using LinkUp.
              </p>

              <div className="waiting-dots">
                <span /><span /><span />
              </div>

              <div className="waiting-user-info">
                <span className="waiting-email">@{form.username} · {form.email}</span>
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

  // ── Normal register form ─────────────────────────────────────────────────
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
        <p className="auth-subtitle">Join millions sharing their story.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="input"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="input"
              placeholder="johndoe"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
              required
              minLength={3}
            />
          </div>

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
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
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
              : 'Request Account'}
          </button>
        </form>

        <p className="auth-link-text">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>

        <div className="login-approval-notice">
          <RiShieldCheckLine className="notice-icon" />
          <span>New accounts require admin approval</span>
        </div>
      </div>
    </div>
  );
}
