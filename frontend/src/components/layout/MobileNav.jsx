import { NavLink } from 'react-router-dom';
import {
  RiHome5Line, RiHome5Fill, RiCompassLine, RiCompassFill,
  RiNotification3Line, RiNotification3Fill, RiUser3Line, RiUser3Fill,
} from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import './MobileNav.css';

export default function MobileNav() {
  const { user } = useAuthStore();
  const navItems = [
    { to: '/', icon: <RiHome5Line />, activeIcon: <RiHome5Fill />, label: 'Home' },
    { to: '/explore', icon: <RiCompassLine />, activeIcon: <RiCompassFill />, label: 'Explore' },
    { to: '/notifications', icon: <RiNotification3Line />, activeIcon: <RiNotification3Fill />, label: 'Notifications' },
    { to: `/profile/${user?.username}`, icon: <RiUser3Line />, activeIcon: <RiUser3Fill />, label: 'Profile' },
  ];

  const handleNavClick = (to, e) => {
    if (window.location.pathname === to) {
      e.preventDefault();
      window.location.reload();
    }
  };

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          onClick={(e) => handleNavClick(item.to, e)}
        >
          {({ isActive }) => (
            <>
              {isActive ? item.activeIcon : item.icon}
              <span className="nav-label">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
