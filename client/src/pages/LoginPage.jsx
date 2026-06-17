import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useLoginMutation } from '../api/authApi.js';
import { setCredentials } from '../features/authSlice.js';
import { useToast } from '../components/Toast.jsx';

const presets = {
  ADMIN: { email: 'admin@dhaba.com', password: 'Admin@12345' },
  STAFF: { email: 'staff@dhaba.com', password: 'Staff@12345' },
  KITCHEN: { email: 'kitchen@dhaba.com', password: 'Kitchen@12345' }
};

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const [form, setForm] = useState({ email: '', password: '' });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) return toast('Email and password required', 'warn');
    try {
      const response = await login(form).unwrap();
      dispatch(setCredentials(response.data));
      navigate('/dashboard');
    } catch (err) {
      toast(err?.data?.message || 'Login failed. Check credentials.', 'error');
    }
  };

  return (
    <main className="login-page">
      <form className="panel login-panel" onSubmit={submit}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🍛</div>
          <h1 style={{ margin: '0.35rem 0 0.15rem', fontSize: '1.5rem', color: 'var(--navy)' }}>Dhaba Management</h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#78716c' }}>Staff & Admin Portal</p>
        </div>

        {/* Quick-fill presets (dev/demo convenience) */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#a8a29e', marginBottom: '0.4rem', textAlign: 'center' }}>Quick fill:</p>
          <div className="quick-row">
            {Object.entries(presets).map(([role, credentials]) => (
              <button type="button" key={role} className="sm" onClick={() => setForm(credentials)}>
                {role}
              </button>
            ))}
          </div>
        </div>

        <label>Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@dhaba.com"
            autoComplete="username"
            required
          />
        </label>
        <label>Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="primary" disabled={isLoading} style={{ marginTop: '0.75rem', width: '100%' }}>
          {isLoading ? 'Signing in…' : '→ Sign In'}
        </button>

        {/* Public order link */}
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.82rem', color: '#78716c', borderTop: '1px solid #e7e5e4', paddingTop: '0.75rem' }}>
          Customer?{' '}
          <Link to="/order" style={{ color: 'var(--gold-dark)', fontWeight: 600 }}>Place an order →</Link>
        </div>
      </form>
    </main>
  );
};

export default LoginPage;
