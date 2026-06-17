import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useCustomerLoginMutation, useCustomerRegisterMutation } from '../api/customerApi.js';
import { setCustomerCredentials } from '../features/customerAuthSlice.js';
import { setCustomer, setCustomerToken } from '../utils/customerAuth.js';
import { useGetSettingsQuery } from '../api/settingsApi.js';

const CustomerLoginPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();
  const from = location.state?.from || '/customer/account';

  const { data: settingsData } = useGetSettingsQuery();
  const dhabaName = settingsData?.data?.settings?.dhabaName || 'Dhaba';

  const [tab, setTab] = useState(location.state?.tab || 'login');

  // Login form
  const [loginPhone, setLoginPhone]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw]     = useState(false);

  // Register form
  const [regName, setRegName]         = useState('');
  const [regPhone, setRegPhone]       = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw]     = useState(false);

  const [loginMutation,  { isLoading: loginLoading,  error: loginError  }] = useCustomerLoginMutation();
  const [registerMutation, { isLoading: regLoading, error: regError }]     = useCustomerRegisterMutation();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await loginMutation({ phone: loginPhone, password: loginPassword }).unwrap();
      const { token, user } = res.data;
      setCustomerToken(token);
      setCustomer({ name: user.name, phone: user.phone });
      dispatch(setCustomerCredentials({ token, user }));
      navigate(from, { replace: true });
    } catch {}
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await registerMutation({ name: regName, phone: regPhone, email: regEmail || undefined, password: regPassword }).unwrap();
      const { token, user } = res.data;
      setCustomerToken(token);
      setCustomer({ name: user.name, phone: user.phone });
      dispatch(setCustomerCredentials({ token, user }));
      navigate(from, { replace: true });
    } catch {}
  };

  const errMsg = (err) => err?.data?.message || err?.error || 'Something went wrong';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div className="cust-header no-print">
        <Link to="/" className="cust-header-brand">
          <span style={{ fontSize: '1.3rem' }}>🍛</span>
          <span>{dhabaName}</span>
        </Link>
        <div className="cust-header-actions">
          <Link to="/order">
            <button className="cust-header-btn">Browse Menu</button>
          </Link>
        </div>
      </div>

      <div className="public-page" style={{ paddingTop: '2rem', maxWidth: 420 }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>🍛</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{dhabaName}</h1>
          <p style={{ color: '#78716c', fontSize: '0.875rem', margin: '0.35rem 0 0' }}>
            {tab === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="cust-login-tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Sign In</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>Create Account</button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form className="panel cust-auth-form" onSubmit={handleLogin}>
            {loginError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{errMsg(loginError)}</div>
            )}
            <label>
              Phone Number
              <input id="login-phone" name="phone" type="tel" autoComplete="tel" required
                placeholder="Enter your mobile number"
                value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} />
            </label>
            <label style={{ position: 'relative' }}>
              Password
              <input id="login-password" name="password" type={showLoginPw ? 'text' : 'password'} autoComplete="current-password" required
                placeholder="Enter your password"
                value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              <button type="button" className="pw-toggle" onClick={() => setShowLoginPw((v) => !v)}>
                {showLoginPw ? '🙈' : '👁'}
              </button>
            </label>
            <button type="submit" className="primary w-full" style={{ borderRadius: 10, padding: '0.85rem', fontWeight: 700 }} disabled={loginLoading}>
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#78716c', margin: '0.75rem 0 0' }}>
              No account?{' '}
              <button type="button" className="link-btn" onClick={() => setTab('register')}>Create one free</button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form className="panel cust-auth-form" onSubmit={handleRegister}>
            {regError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{errMsg(regError)}</div>
            )}
            <label>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
              <input id="reg-name" name="name" type="text" autoComplete="name" required
                placeholder="e.g. Rahul Sharma"
                value={regName} onChange={(e) => setRegName(e.target.value)} />
            </label>
            <label>
              Phone Number <span style={{ color: '#ef4444' }}>*</span>
              <input id="reg-phone" name="phone" type="tel" autoComplete="tel" required
                placeholder="10-digit mobile number"
                value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
            </label>
            <label>
              Email <span style={{ color: '#a8a29e', fontSize: '0.75rem' }}>(optional)</span>
              <input id="reg-email" name="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            </label>
            <label style={{ position: 'relative' }}>
              Password <span style={{ color: '#ef4444' }}>*</span>
              <input id="reg-password" name="password" type={showRegPw ? 'text' : 'password'} autoComplete="new-password" required
                placeholder="At least 6 characters"
                value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              <button type="button" className="pw-toggle" onClick={() => setShowRegPw((v) => !v)}>
                {showRegPw ? '🙈' : '👁'}
              </button>
            </label>
            <button type="submit" className="primary w-full" style={{ borderRadius: 10, padding: '0.85rem', fontWeight: 700 }} disabled={regLoading}>
              {regLoading ? 'Creating account…' : 'Create Account'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#78716c', margin: '0.75rem 0 0' }}>
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => setTab('login')}>Sign in</button>
            </p>
          </form>
        )}

        {/* Divider */}
        <div style={{ textAlign: 'center', color: '#a8a29e', fontSize: '0.8rem', margin: '1rem 0' }}>
          or continue without an account
        </div>
        <Link to="/order">
          <button className="w-full" style={{ borderRadius: 10, padding: '0.75rem', fontWeight: 600, background: '#fff', border: '1.5px solid #e7e5e4', color: '#57534e' }}>
            🛍 Browse Menu &amp; Order
          </button>
        </Link>

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  );
};

export default CustomerLoginPage;
