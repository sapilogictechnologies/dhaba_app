import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLogoutMutation } from '../api/authApi.js';
import { clearCredentials } from '../features/authSlice.js';
import { useGetSettingsQuery } from '../api/settingsApi.js';

const roleLinks = {
  ADMIN: [
    ['/', 'Dashboard'],
    ['/admin-orders', 'Orders'],
    ['/billing', 'Billing'],
    ['/kitchen', 'Kitchen'],
    ['/menu', 'Menu'],
    ['/tables', 'Tables'],
    ['/reports', 'Reports'],
    ['/expenses', 'Expenses'],
    ['/settings', 'Settings'],
    ['/realtime', 'Live']
  ],
  STAFF: [
    ['/', 'Dashboard'],
    ['/staff-orders', 'Orders'],
    ['/billing', 'Billing'],
    ['/menu', 'Menu'],
    ['/tables', 'Tables'],
    ['/reports', 'Reports'],
    ['/expenses', 'Expenses']
  ],
  KITCHEN: [
    ['/', 'Dashboard'],
    ['/kitchen', 'Kitchen'],
    ['/menu', 'Menu']
  ]
};

const Nav = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [logoutApi] = useLogoutMutation();
  const { data: settingsData } = useGetSettingsQuery();
  const dhabaName = settingsData?.data?.settings?.dhabaName || import.meta.env.VITE_APP_NAME || 'Dhaba';

  const logout = async () => {
    try { await logoutApi().unwrap(); } catch { /* still clear locally */ }
    dispatch(clearCredentials());
    navigate('/login');
  };

  const links = roleLinks[user?.role] || [];

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🍛</span>
        <strong>{dhabaName}</strong>
        {user && <span className="role-pill">{user.role}</span>}
      </div>
      <div className="nav-links">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {label}
          </NavLink>
        ))}
        {user && (
          <button onClick={logout} className="sm" style={{ marginLeft: '0.25rem' }}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Nav;
