import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine, RiArrowRightLine, RiCheckLine, RiUserLine, RiAtLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { validatePassword } from '../utils/passwordValidator';
import { hasAbusiveLanguage } from '../utils/badWordsFilter';
import './AuthPages.css';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm]         = useState({ name: '', username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState('');

  const pwdCheck = validatePassword(form.password, {
    name: form.name,
    username: form.username,
    email: form.email,
  });

  const getStrengthScore = () => {
    if (!form.password) return 0;
    let score = 0;
    if (form.password.length >= 8) score++;
    if (form.password.length >= 10) score++;
    if (pwdCheck.checks.hasUppercase) score++;
    if (pwdCheck.checks.hasLowercase) score++;
    if (pwdCheck.checks.hasNumber) score++;
    if (pwdCheck.checks.hasSpecial) score++;
    if (pwdCheck.checks.notCommon) score++;
    if (pwdCheck.checks.noPersonalInfo) score++;
    return score; // Max 8
  };

  const getStrengthMeta = (score) => {
    if (score === 0) return { label: 'Empty', color: 'rgba(255,255,255,0.1)' };
    if (score <= 3) return { label: 'Weak', color: '#ef4444' };
    if (score <= 5) return { label: 'Fair', color: '#f97316' };
    if (score <= 7) return { label: 'Good', color: '#eab308' };
    return { label: 'Very Strong', color: '#10b981' };
  };

  const score = getStrengthScore();
  const meta = getStrengthMeta(score);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasAbusiveLanguage(form.name) || hasAbusiveLanguage(form.username) || hasAbusiveLanguage(form.email)) {
      toast.error('Registration blocked: Abusive, profane, or inappropriate language is strictly prohibited.');
      return;
    }
    if (!pwdCheck.isValid) {
      toast.error(pwdCheck.errors[0] || 'Password does not meet the strong password criteria');
      return;
    }
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
        {/* Coder Badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="coder-badge-container">
            <span className="coder-status-dot" />
            <span className="coder-badge-text">WORLD'S TOP 10 CODER SECURE PORTAL</span>
          </div>
        </div>

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
                <span style={{ marginLeft: 8, color: meta.color, fontWeight: 700, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                  — {meta.label}
                </span>
              )}
            </label>
            <div className="input-wrapper">
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                required
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
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= score ? meta.color : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            )}

            {/* Password requirements checklist */}
            {form.password && (
              <div className="pwd-checklist">
                <div className="pwd-checklist-title">Password Security Checklist:</div>
                <ul className="pwd-checklist-list">
                  <li className={pwdCheck.checks.lengthMin ? 'met' : 'unmet'}>
                    {pwdCheck.checks.lengthMin ? <RiCheckLine className="icon-met" /> : <span className="bullet-unmet" />}
                    <span>Length: Min 8 chars {pwdCheck.checks.lengthBetter ? '(10+ Better ✓)' : '(10+ better)'}</span>
                  </li>
                  <li className={(pwdCheck.checks.hasUppercase && pwdCheck.checks.hasLowercase) ? 'met' : 'unmet'}>
                    {(pwdCheck.checks.hasUppercase && pwdCheck.checks.hasLowercase) ? <RiCheckLine className="icon-met" /> : <span className="bullet-unmet" />}
                    <span>Case: Uppercase & lowercase letters</span>
                  </li>
                  <li className={pwdCheck.checks.hasNumber ? 'met' : 'unmet'}>
                    {pwdCheck.checks.hasNumber ? <RiCheckLine className="icon-met" /> : <span className="bullet-unmet" />}
                    <span>Numbers: Include numbers (e.g. 1 2 3)</span>
                  </li>
                  <li className={pwdCheck.checks.hasSpecial ? 'met' : 'unmet'}>
                    {pwdCheck.checks.hasSpecial ? <RiCheckLine className="icon-met" /> : <span className="bullet-unmet" />}
                    <span>Symbols: Special symbols (@ # $ % & *)</span>
                  </li>
                  <li className={pwdCheck.checks.notCommon ? 'met' : 'unmet'}>
                    {pwdCheck.checks.notCommon ? <RiCheckLine className="icon-met" /> : <span className="bullet-unmet" />}
                    <span>Unique: Avoid common words (e.g., qwerty, password)</span>
                  </li>
                  <li className={pwdCheck.checks.noPersonalInfo ? 'met' : 'unmet'}>
                    {pwdCheck.checks.noPersonalInfo ? <RiCheckLine className="icon-met" /> : <span className="bullet-unmet" />}
                    <span>Safe: No personal info (name, phone, birth year, school)</span>
                  </li>
                </ul>
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
