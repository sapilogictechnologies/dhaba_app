import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getCustomerToken } from '../utils/customerAuth.js';

const CustomerBottomNav = ({ cartCount = 0, onCartClick }) => {
  const location = useLocation();
  const { token: custToken } = useSelector(s => s.customerAuth);
  const isLoggedIn = !!(custToken || getCustomerToken());
  const path = location.pathname;

  const tabs = [
    { icon: '🏠', label: 'Home',   to: '/',                  active: path === '/' },
    { icon: '🍽',  label: 'Menu',   to: '/order',             active: path === '/order' },
    {
      icon: cartCount > 0 ? '🛒' : '🛒',
      label: 'Cart',
      to: null, // handled by onCartClick
      active: false,
      cart: true,
    },
    {
      icon: '👤',
      label: isLoggedIn ? 'Account' : 'Sign In',
      to: isLoggedIn ? '/customer/account' : '/customer/login',
      active: path === '/customer/account' || path === '/customer/login',
    },
  ];

  return (
    <div className="cust-bottom-nav no-print">
      {tabs.map(tab => {
        if (tab.cart) {
          return (
            <button
              key="cart"
              type="button"
              className="cust-bottom-nav-item"
              onClick={onCartClick}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
            >
              <span className="cust-bottom-nav-icon">
                {tab.icon}
                {cartCount > 0 && (
                  <span className="cust-bottom-nav-badge">{cartCount > 9 ? '9+' : cartCount}</span>
                )}
              </span>
              <span className="cust-bottom-nav-label">{tab.label}</span>
            </button>
          );
        }
        return (
          <Link key={tab.to} to={tab.to} className={`cust-bottom-nav-item${tab.active ? ' active' : ''}`}>
            <span className="cust-bottom-nav-icon">{tab.icon}</span>
            <span className="cust-bottom-nav-label">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default CustomerBottomNav;
