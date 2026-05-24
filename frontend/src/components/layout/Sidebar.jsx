import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  RiHome5Line, RiHome5Fill, RiCompassLine, RiCompassFill,
  RiNotification3Line, RiNotification3Fill, RiBookmarkLine, RiBookmarkFill,
  RiUser3Line, RiUser3Fill, RiLogoutBoxLine, RiPaletteLine,
  RiMailLine, RiMailFill, RiShieldCheckLine,
} from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: <RiHome5Line />, activeIcon: <RiHome5Fill />, label: 'Home' },
  { to: '/explore', icon: <RiCompassLine />, activeIcon: <RiCompassFill />, label: 'Explore' },
  { to: '/notifications', icon: <RiNotification3Line />, activeIcon: <RiNotification3Fill />, label: 'Notifications' },
  { to: '/messages', icon: <RiMailLine />, activeIcon: <RiMailFill />, label: 'Messages' },
  { to: '/saved', icon: <RiBookmarkLine />, activeIcon: <RiBookmarkFill />, label: 'Saved' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showThemes, setShowThemes] = useState(false);

  const selectTheme = (themeName) => {
    localStorage.setItem('linkup-theme', themeName);
    document.body.className = '';
    if (themeName !== 'emerald') {
      document.body.classList.add(`theme-${themeName}`);
    }
    setShowThemes(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (to, e) => {
    if (window.location.pathname === to) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link to="/" className="sidebar-logo" onClick={() => { window.location.href = '/'; }}>
        <img src="/linkup-logo.svg" alt="LinkUp" className="logo-img" />
        <span className="logo-text">LinkUp</span>
      </Link>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={(e) => handleNavClick(item.to, e)}
          >
            {({ isActive }) => (
              <>
                <span className="sidebar-link-icon">{isActive ? item.activeIcon : item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
                {isActive && <div className="active-pill" />}
              </>
            )}
          </NavLink>
        ))}

        {user && (
          <NavLink
            to={`/profile/${user.username}`}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={(e) => handleNavClick(`/profile/${user.username}`, e)}
          >
            {({ isActive }) => (
              <>
                <span className="sidebar-link-icon">{isActive ? <RiUser3Fill /> : <RiUser3Line />}</span>
                <span className="sidebar-link-label">Profile</span>
              </>
            )}
          </NavLink>
        )}

        {/* Admin Panel link — only for admins */}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={(e) => handleNavClick('/admin', e)}
          >
            {({ isActive }) => (
              <>
                <span className="sidebar-link-icon">
                  <RiShieldCheckLine />
                </span>
                <span className="sidebar-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Admin
                  <span style={{
                    fontSize: 9, fontWeight: 800, background: 'linear-gradient(135deg,#7c5cff,#06b6d4)',
                    color: 'white', padding: '1px 5px', borderRadius: 6, letterSpacing: 0.5,
                  }}>PRO</span>
                </span>
              </>
            )}
          </NavLink>
        )}

        {/* Theme Trigger & Dropdown */}
        <div className="sidebar-theme-container">
          <button className="sidebar-link theme-trigger-btn" onClick={() => setShowThemes(!showThemes)}>
            <span className="sidebar-link-icon"><RiPaletteLine /></span>
            <span className="sidebar-link-label">Theme</span>
          </button>
          {showThemes && (
            <div className="theme-dropdown scale-in">
              <button onClick={() => selectTheme('emerald')} className="theme-option emerald">
                <span className="theme-dot emerald-dot" /> Emerald
              </button>
              <button onClick={() => selectTheme('cyberpunk')} className="theme-option cyberpunk">
                <span className="theme-dot cyberpunk-dot" /> Cyberpunk
              </button>
              <button onClick={() => selectTheme('deepspace')} className="theme-option deepspace">
                <span className="theme-dot deepspace-dot" /> Deep Space
              </button>
              <button onClick={() => selectTheme('amethyst')} className="theme-option amethyst">
                <span className="theme-dot amethyst-dot" /> Amethyst
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* User card */}
      {user && (
        <div className="sidebar-user">
          <Link to={`/profile/${user.username}`} className="sidebar-user-info">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar avatar-md" />
            ) : (
              <div className="avatar-placeholder avatar-md">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="sidebar-user-text">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-handle">@{user.username}</span>
            </div>
          </Link>
          <button className="btn-icon sidebar-logout" onClick={handleLogout} title="Logout">
            <RiLogoutBoxLine />
          </button>
        </div>
      )}
    </aside>
  );
}
