import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLogoutMutation } from '../api/authApi.js';
import { clearCredentials } from '../features/authSlice.js';
import { useGetSettingsQuery } from '../api/settingsApi.js';

const roleLinks = {
  ADMIN: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/admin-orders', icon: '📋', label: 'Orders' },
    { to: '/billing', icon: '🧾', label: 'Billing' },
    { to: '/kitchen', icon: '🍳', label: 'Kitchen' },
    { to: '/menu', icon: '🍽', label: 'Menu' },
    { to: '/tables', icon: '🪑', label: 'Tables' },
    { to: '/reports', icon: '📈', label: 'Reports' },
    { to: '/expenses', icon: '💸', label: 'Expenses' },
    { to: '/settings', icon: '⚙️', label: 'Settings' },
    { to: '/realtime', icon: '📡', label: 'Live' },
  ],
  STAFF: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/staff-orders', icon: '➕', label: 'Orders' },
    { to: '/billing', icon: '🧾', label: 'Billing' },
    { to: '/menu', icon: '🍽', label: 'Menu' },
    { to: '/tables', icon: '🪑', label: 'Tables' },
    { to: '/reports', icon: '📈', label: 'Reports' },
    { to: '/expenses', icon: '💸', label: 'Expenses' },
  ],
  KITCHEN: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/kitchen', icon: '🍳', label: 'Kitchen' },
    { to: '/menu', icon: '🍽', label: 'Menu' },
  ],
};

const bottomLinks = {
  ADMIN: [
    { to: '/dashboard', icon: '📊', label: 'Home' },
    { to: '/admin-orders', icon: '📋', label: 'Orders' },
    { to: '/kitchen', icon: '🍳', label: 'Kitchen' },
    { to: '/billing', icon: '🧾', label: 'Billing' },
    { to: '/tables', icon: '🪑', label: 'Tables' },
  ],
  STAFF: [
    { to: '/dashboard', icon: '📊', label: 'Home' },
    { to: '/staff-orders', icon: '➕', label: 'Orders' },
    { to: '/billing', icon: '🧾', label: 'Billing' },
    { to: '/tables', icon: '🪑', label: 'Tables' },
    { to: '/menu', icon: '🍽', label: 'Menu' },
  ],
  KITCHEN: [
    { to: '/dashboard', icon: '📊', label: 'Home' },
    { to: '/kitchen', icon: '🍳', label: 'Kitchen' },
    { to: '/menu', icon: '🍽', label: 'Menu' },
  ],
};

const Layout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [logoutApi] = useLogoutMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: settingsData } = useGetSettingsQuery();
  const dhabaName = settingsData?.data?.settings?.dhabaName
    || import.meta.env.VITE_APP_NAME
    || 'Dhaba';

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const logout = async () => {
    try { await logoutApi().unwrap(); } catch { /* ignore */ }
    dispatch(clearCredentials());
    navigate('/login');
  };

  const links  = roleLinks[user?.role]  || [];
  const blinks = bottomLinks[user?.role] || [];

  return (
    <div className="app-shell">
      {/* ── Drawer overlay (mobile) ── */}
      {drawerOpen && (
        <div className="sidebar-overlay" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar${drawerOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <span style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>🍛</span>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-brand-name">{dhabaName}</div>
            {user && (
              <span className="role-pill" style={{ marginTop: '0.3rem' }}>{user.role}</span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              👤 {user.name || user.email}
            </div>
          )}
          <button onClick={logout} className="sidebar-logout">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="app-content">
        {/* Mobile top bar — hidden on desktop */}
        <div className="mobile-topbar no-print">
          <button
            className="hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <div className="mobile-topbar-brand">
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🍛</span>
            <strong>{dhabaName}</strong>
          </div>
          {user && <span className="role-pill">{user.role}</span>}
        </div>

        <main className="app-main">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="app-bottom-nav no-print" aria-label="Bottom navigation">
        {blinks.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
