import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine, RiArrowRightLine, RiCheckLine, RiUserLine, RiAtLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm]         = useState({ name: '', username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState('');

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0-5
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#10b981', '#7c5cff'];
  const ps = passwordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    const result = await register(form.username, form.email, form.password, form.name);
    if (result.success) {
      navigate('/');
      toast.success('Account created! Welcome to LinkUp 🚀');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb orb1" />
      <div className="auth-bg-orb orb2" />
      <div className="auth-bg-orb orb3" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <img src="/linkup-logo.svg" alt="LinkUp" className="auth-logo-img" />
          <h1 className="auth-title">LinkUp</h1>
        </div>
        <p className="auth-subtitle">Join millions sharing their story.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="input"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused('')}
              required
              autoComplete="name"
            />
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="input"
                placeholder="johndoe"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused('')}
                required
                minLength={3}
                autoComplete="username"
                style={{ paddingLeft: 36 }}
              />
              <RiAtLine style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.25)', fontSize: 16, pointerEvents: 'none',
              }} />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">
              Password
              {form.password && (
                <span style={{ marginLeft: 8, color: strengthColor[ps], fontWeight: 700, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                  — {strengthLabel[ps]}
                </span>
              )}
            </label>
            <div className="input-wrapper">
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>

            {/* Strength bar */}
            {form.password && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= ps ? strengthColor[ps] : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            ) : (
              <>Create Account &nbsp;<RiArrowRightLine style={{ fontSize: 16, verticalAlign: 'middle' }} /></>
            )}
          </button>
        </form>

        {/* Feature bullets */}
        <div className="auth-features">
          {['Free forever', 'No spam', 'Private & secure'].map((f) => (
            <div key={f} className="auth-feature-item">
              <RiCheckLine /> {f}
            </div>
          ))}
        </div>

        <div className="auth-divider" style={{ marginTop: 18 }}>or</div>

        <p className="auth-link-text" style={{ marginTop: 12 }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
