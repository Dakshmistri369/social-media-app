import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine, RiArrowRightLine, RiCheckLine, RiMailLine } from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { validatePassword } from '../utils/passwordValidator';
import { hasAbusiveLanguage } from '../utils/badWordsFilter';
import './AuthPages.css';

export default function LoginPage() {
  const { login, sendOtp, verifyOtp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  
  // Email Login States
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  
  // OTP Login States
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'otp'
  const [rawPhone, setRawPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

  const [focused, setFocused] = useState('');

  const pwdCheck = validatePassword(form.password, {
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
    if (hasAbusiveLanguage(form.email)) {
      toast.error('Login blocked: Abusive, profane, or inappropriate language is strictly prohibited.');
      return;
    }
    if (!pwdCheck.isValid) {
      toast.error(pwdCheck.errors[0] || 'Password does not meet the strong password criteria');
      return;
    }
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate('/');
      toast.success('Welcome back! 👋');
    } else {
      toast.error(result.message);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (/^(\d)\1{9}$/.test(rawPhone)) {
      toast.error('Dummy repeating numbers are not allowed.');
      return;
    }
    if ('0123456789'.includes(rawPhone) || '9876543210'.includes(rawPhone)) {
      toast.error('Simple sequential numbers are not allowed.');
      return;
    }
    const formattedPhone = `+91${rawPhone}`;
    const result = await sendOtp(formattedPhone);
    if (result.success) {
      setOtpSent(true);
      if (result.otp) {
        setDemoOtp(result.otp);
      }
      toast.success('Verification code sent successfully!');
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('OTP must be a 6-digit number.');
      return;
    }
    const formattedPhone = `+91${rawPhone}`;
    const result = await verifyOtp(formattedPhone, otpCode);
    if (result.success) {
      navigate('/');
      toast.success(result.isNewUser ? 'Welcome to LinkUp! Your account is created 🚀' : 'Welcome back! 👋');
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
        <p className="auth-subtitle">Welcome back! Sign in or verify to access your account.</p>

        {/* Toggle between Email & OTP */}
        <div className="auth-toggle-tabs">
          <button 
            type="button" 
            className={`auth-toggle-tab ${loginMethod === 'email' ? 'active' : ''}`}
            onClick={() => setLoginMethod('email')}
          >
            Email Login
          </button>
          <button 
            type="button" 
            className={`auth-toggle-tab ${loginMethod === 'otp' ? 'active' : ''}`}
            onClick={() => setLoginMethod('otp')}
          >
            Mobile OTP
          </button>
        </div>

        {loginMethod === 'email' ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  className={`input ${focused === 'email' ? 'input-focused' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  required
                  autoComplete="email"
                />
              </div>
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
                  placeholder="Your password (min 8 chars)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  required
                  autoComplete="current-password"
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
                      <span>Safe: No personal info (email, phone, birth year, school)</span>
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
                <>Sign In &nbsp;<RiArrowRightLine style={{ fontSize: 16, verticalAlign: 'middle' }} /></>
              )}
            </button>
          </form>
        ) : (
          <div className="auth-form-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!otpSent ? (
              <form className="auth-form" onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <div className="phone-input-container">
                    <div className="phone-prefix">🇮🇳 +91</div>
                    <input
                      type="tel"
                      className={`input ${focused === 'phone' ? 'input-focused' : ''}`}
                      placeholder="Enter 10-digit number"
                      value={rawPhone}
                      onChange={(e) => setRawPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onFocus={() => setFocused('phone')}
                      onBlur={() => setFocused('')}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  ) : (
                    <>Get OTP &nbsp;<RiArrowRightLine style={{ fontSize: 16, verticalAlign: 'middle' }} /></>
                  )}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label className="form-label">Verification Code (OTP)</label>
                  <input
                    type="text"
                    pattern="\d*"
                    className={`input ${focused === 'otp' ? 'input-focused' : ''}`}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setFocused('otp')}
                    onBlur={() => setFocused('')}
                    required
                  />
                  
                  {demoOtp && (
                    <div className="otp-box-info">
                      <span>💡 Demo Mode:</span> Use OTP code <strong>{demoOtp}</strong> to verify.
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
                    <>Verify & Sign In &nbsp;<RiArrowRightLine style={{ fontSize: 16, verticalAlign: 'middle' }} /></>
                  )}
                </button>
                
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.45)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    alignSelf: 'center',
                    marginTop: '4px'
                  }}
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setDemoOtp('');
                  }}
                >
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}

        <div className="auth-divider">or</div>

        <p className="auth-link-text" style={{ marginTop: 12 }}>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
