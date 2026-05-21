import { NavLink } from 'react-router-dom';
import {
  RiHome5Line, RiHome5Fill, RiCompassLine, RiCompassFill,
  RiBellLine, RiBellFill, RiUser3Line, RiUser3Fill,
} from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import './MobileNav.css';

export default function MobileNav() {
  const { user } = useAuthStore();
  const navItems = [
    { to: '/', icon: <RiHome5Line />, activeIcon: <RiHome5Fill />, label: 'Home' },
    { to: '/explore', icon: <RiCompassLine />, activeIcon: <RiCompassFill />, label: 'Explore' },
    { to: '/notifications', icon: <RiBellLine />, activeIcon: <RiBellFill />, label: 'Notifications' },
    { to: `/profile/${user?.username}`, icon: <RiUser3Line />, activeIcon: <RiUser3Fill />, label: 'Profile' },
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
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
