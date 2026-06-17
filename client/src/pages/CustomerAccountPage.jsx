import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetCustomerProfileQuery, useGetCustomerOrdersQuery,
  useUpdateCustomerProfileMutation, useChangeCustomerPasswordMutation,
  useAddCustomerAddressMutation, useDeleteCustomerAddressMutation
} from '../api/customerApi.js';
import { clearCustomerCredentials, updateCustomerUser } from '../features/customerAuthSlice.js';
import { clearCustomer, setCustomerToken } from '../utils/customerAuth.js';
import { useGetSettingsQuery } from '../api/settingsApi.js';
import CustomerBottomNav from '../components/CustomerBottomNav.jsx';

const ACTIVE_STATUSES = ['PLACED', 'UNDER_REVIEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
const DONE_STATUSES   = ['DELIVERED', 'PICKED_UP', 'COMPLETED', 'CLOSED', 'CANCELLED', 'EXPIRED'];

const STATUS_INFO = {
  PLACED:           { label: 'Placed',           color: '#92400e', bg: '#fef3c7', icon: '📋' },
  UNDER_REVIEW:     { label: 'Payment Review',   color: '#c2410c', bg: '#ffedd5', icon: '🔍' },
  ACCEPTED:         { label: 'Accepted',         color: '#1d4ed8', bg: '#dbeafe', icon: '✅' },
  PREPARING:        { label: 'Preparing',        color: '#7c3aed', bg: '#f3e8ff', icon: '👨‍🍳' },
  READY:            { label: 'Ready!',           color: '#15803d', bg: '#dcfce7', icon: '🔔' },
  OUT_FOR_DELIVERY: { label: 'On the Way',       color: '#0e7490', bg: '#cffafe', icon: '🚴' },
  DELIVERED:        { label: 'Delivered',        color: '#15803d', bg: '#dcfce7', icon: '✅' },
  PICKED_UP:        { label: 'Picked Up',        color: '#15803d', bg: '#dcfce7', icon: '✅' },
  COMPLETED:        { label: 'Completed',        color: '#15803d', bg: '#dcfce7', icon: '✅' },
  CLOSED:           { label: 'Closed',           color: '#475569', bg: '#f1f5f9', icon: '🔒' },
  CANCELLED:        { label: 'Cancelled',        color: '#dc2626', bg: '#fee2e2', icon: '✗' },
  EXPIRED:          { label: 'Expired',          color: '#64748b', bg: '#f1f5f9', icon: '⏰' },
};

const SOURCE_LABELS = {
  WALKIN_TABLE: 'Dine-in', TAKEAWAY_COUNTER: 'Takeaway',
  PHONE_MANUAL: 'Phone Order', QR_TABLE: 'Table Order',
  ONLINE_PICKUP: 'Pickup', ONLINE_DELIVERY: 'Home Delivery'
};

const SOURCE_ICONS = {
  WALKIN_TABLE: '🪑', TAKEAWAY_COUNTER: '🏪', PHONE_MANUAL: '📞',
  QR_TABLE: '📲', ONLINE_PICKUP: '🛍', ONLINE_DELIVERY: '🚴',
};

const StatusBadge = ({ status }) => {
  const info = STATUS_INFO[status] || { label: status, color: '#475569', bg: '#f1f5f9', icon: '•' };
  return (
    <span style={{ background: info.bg, color: info.color, borderRadius: 999, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {info.icon} {info.label}
    </span>
  );
};

/* ── Active order live card ── */
const ActiveOrderCard = ({ order, navigate }) => {
  const info = STATUS_INFO[order.status] || STATUS_INFO.PLACED;
  const allItems = order.kotItemsSnapshot?.length ? order.kotItemsSnapshot : order.items;
  const preview = allItems.slice(0, 2).map(i => `${i.qty}× ${i.nameSnapshot || i.name}`).join(', ');
  const eta = order.delivery?.etaMinutesCalculated;
  const isReady = order.status === 'READY';

  return (
    <div
      onClick={() => navigate(`/order-status/${order.orderNo}`)}
      role="button" tabIndex={0}
      style={{
        background: isReady ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
        border: `2px solid ${isReady ? '#16a34a' : '#3b82f6'}`,
        borderRadius: 18, padding: '1.1rem 1.25rem',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
        marginBottom: '0.75rem',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(30,58,95,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="live-dot" />
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1c1917' }}>{order.orderNo}</span>
          <span style={{ fontSize: '0.72rem', background: '#fff', borderRadius: 6, padding: '0.1rem 0.4rem', color: '#78716c', fontWeight: 600 }}>
            {SOURCE_ICONS[order.source]} {SOURCE_LABELS[order.source] || order.source}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ fontSize: '0.83rem', color: '#374151', marginBottom: '0.5rem', fontWeight: 500 }}>
        {preview}{allItems.length > 2 && <span style={{ color: '#6b7280' }}> +{allItems.length - 2} more</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#374151' }}>
          <span style={{ fontWeight: 700, color: '#d97706', fontSize: '1rem' }}>₹{order.total}</span>
          {eta > 0 && <span>⏱ ~{eta} min</span>}
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isReady ? '#15803d' : '#1d4ed8' }}>
          {isReady ? '🔔 Tap to collect →' : '📍 Track Live →'}
        </span>
      </div>
    </div>
  );
};

/* ── Order history mini card ── */
const OrderHistoryCard = ({ order, navigate, onReorder }) => {
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const allItems = order.kotItemsSnapshot?.length ? order.kotItemsSnapshot : order.items;
  const preview  = allItems.slice(0, 2).map(i => `${i.qty}× ${i.nameSnapshot || i.name}`).join(', ');
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div
      className={`order-card-v2 ${isActive ? 'active-order' : isCancelled ? 'cancelled-order' : 'completed-order'}`}
      style={{ marginBottom: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1c1917' }}>{order.orderNo}</span>
          <span style={{ fontSize: '0.7rem', background: '#f5f5f4', color: '#78716c', borderRadius: 4, padding: '0.1rem 0.35rem', fontWeight: 600, marginLeft: '0.4rem' }}>
            {SOURCE_ICONS[order.source]} {SOURCE_LABELS[order.source] || order.source}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ fontSize: '0.82rem', color: '#57534e', marginBottom: '0.5rem' }}>
        {preview}{allItems.length > 2 && <span style={{ color: '#a8a29e' }}> +{allItems.length - 2} more</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#d97706', fontSize: '0.95rem' }}>₹{order.total}</span>
          <span style={{ fontSize: '0.72rem', color: '#a8a29e' }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {!isCancelled && (
            <button
              onClick={e => { e.stopPropagation(); onReorder(order); }}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}
            >
              ↻ Reorder
            </button>
          )}
          <button
            onClick={() => navigate(`/order-status/${order.orderNo}`)}
            style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: 8, background: '#f0f4fb', border: '1px solid #c0d0e8', color: '#1e3a5f', fontWeight: 700, cursor: 'pointer' }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Empty state ── */
const EmptyOrders = () => (
  <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
    <div style={{ fontSize: '4rem', marginBottom: '0.75rem', lineHeight: 1 }}>🍽</div>
    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: '#1c1917' }}>No orders yet</h3>
    <p style={{ fontSize: '0.875rem', color: '#78716c', margin: '0 0 1.5rem' }}>
      Your order history will appear here. Try placing your first order!
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', maxWidth: 300, margin: '0 auto 1.5rem' }}>
      {[
        { icon: '🛍', label: 'Pickup Order', desc: 'Fast & easy' },
        { icon: '🚴', label: 'Home Delivery', desc: 'At your door' },
      ].map(c => (
        <Link key={c.label} to="/order" style={{ textDecoration: 'none' }}>
          <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '1rem 0.75rem', background: '#fff', textAlign: 'center', transition: 'border-color 0.15s' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e3a5f' }}>{c.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#78716c' }}>{c.desc}</div>
          </div>
        </Link>
      ))}
    </div>
    <Link to="/order">
      <button style={{ background: '#1e3a5f', border: 'none', color: '#fff', borderRadius: 12, padding: '0.85rem 2rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
        🛍 Order Now
      </button>
    </Link>
  </div>
);

/* ── Empty addresses ── */
const EmptyAddresses = ({ onAdd }) => (
  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📍</div>
    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', color: '#1c1917' }}>No saved addresses</h3>
    <p style={{ fontSize: '0.82rem', color: '#78716c', margin: '0 0 1.25rem' }}>
      Save addresses for faster delivery checkout
    </p>
    <button
      onClick={onAdd}
      style={{ background: '#fef3c7', border: '1.5px dashed #d97706', color: '#92400e', borderRadius: 12, padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
    >
      + Add Your First Address
    </button>
  </div>
);

const CustomerAccountPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector(s => s.customerAuth);

  const { data: settingsData } = useGetSettingsQuery();
  const dhabaName = settingsData?.data?.settings?.dhabaName || 'Dhaba';

  useEffect(() => {
    if (!token) navigate('/customer/login', { replace: true });
  }, [token, navigate]);

  const [activeTab, setActiveTab] = useState('orders');
  const { data: profileData, refetch: refetchProfile } = useGetCustomerProfileQuery(undefined, { skip: !token });
  const { data: ordersData, isLoading: ordersLoading } = useGetCustomerOrdersQuery(undefined, { skip: !token });

  const user   = profileData?.data?.user || null;
  const orders = ordersData?.data?.orders || [];
  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const past   = orders.filter(o => DONE_STATUSES.includes(o.status));

  const totalSpent = orders.filter(o => !['CANCELLED','EXPIRED'].includes(o.status)).reduce((s,o) => s + (o.total||0), 0);
  const favoriteSource = (() => {
    const counts = {};
    orders.forEach(o => { counts[o.source] = (counts[o.source]||0) + 1; });
    const best = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
    return best ? SOURCE_LABELS[best[0]] || best[0] : null;
  })();

  // Profile edit
  const [editName, setEditName]   = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMode, setEditMode]   = useState(false);
  const [updateProfile, { isLoading: saving }] = useUpdateCustomerProfileMutation();

  useEffect(() => {
    if (user) { setEditName(user.name || ''); setEditEmail(user.email || ''); }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile({ name: editName, email: editEmail }).unwrap();
      dispatch(updateCustomerUser(res.data.user));
      refetchProfile();
      setEditMode(false);
    } catch {}
  };

  // Password
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [changePassword, { isLoading: pwLoading }] = useChangeCustomerPasswordMutation();

  const handleChangePw = async (e) => {
    e.preventDefault();
    setPwMsg('');
    try {
      await changePassword({ currentPassword: curPw, newPassword: newPw }).unwrap();
      setPwMsg('Password changed successfully!');
      setCurPw(''); setNewPw('');
    } catch (err) {
      setPwMsg(err?.data?.message || 'Failed to change password');
    }
  };

  // Addresses
  const [newAddr, setNewAddr]       = useState({ label: 'Home', addressText: '', landmark: '' });
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addAddress,  { isLoading: addingAddr }] = useAddCustomerAddressMutation();
  const [deleteAddress] = useDeleteCustomerAddressMutation();

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await addAddress(newAddr).unwrap();
      refetchProfile();
      setNewAddr({ label: 'Home', addressText: '', landmark: '' });
      setShowAddAddr(false);
    } catch {}
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Remove this address?')) return;
    await deleteAddress(id).unwrap().then(() => refetchProfile()).catch(() => {});
  };

  const handleLogout = () => {
    setCustomerToken(null);
    clearCustomer();
    dispatch(clearCustomerCredentials());
    navigate('/', { replace: true });
  };

  // Quick reorder — navigate to /order (items pre-selection not possible without state, just navigate)
  const handleReorder = () => navigate('/order');

  if (!token) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Header ── */}
      <div className="cust-header no-print">
        <Link to="/" className="cust-header-brand">
          <span style={{ fontSize: '1.3rem' }}>🍛</span>
          <span>{dhabaName}</span>
        </Link>
        <div className="cust-header-actions">
          <Link to="/order"><button className="cust-header-btn">+ New Order</button></Link>
          <button className="cust-header-btn danger" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="public-page" style={{ paddingTop: '1.25rem' }}>

        {/* ── Profile Hero ── */}
        {user ? (
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5282 100%)',
            borderRadius: 20, padding: '1.5rem', marginBottom: '1.25rem',
            boxShadow: '0 4px 20px rgba(30,58,95,0.2)',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 900, flexShrink: 0,
                boxShadow: '0 3px 12px rgba(245,158,11,0.4)'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', marginBottom: '0.1rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
                  📞 {user.phone}{user.email ? ` · ${user.email}` : ''}
                </div>
              </div>
              {active.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 999, padding: '0.3rem 0.75rem' }}>
                  <span className="live-dot" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6ee7b7', whiteSpace: 'nowrap' }}>{active.length} Active</span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
              {[
                { icon: '📦', label: 'Total Orders', value: orders.length },
                { icon: '💰', label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN')}` },
                { icon: '❤️', label: 'Fav Mode', value: favoriteSource || '—' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>{s.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fbbf24', lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem', lineHeight: 1.2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: '#e2e8f0', borderRadius: 20, padding: '1.5rem', marginBottom: '1.25rem', height: 160 }} />
        )}

        {/* ── Active Orders Banner ── */}
        {active.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <span className="live-dot" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f' }}>
                Live Orders
              </span>
            </div>
            {active.map(o => <ActiveOrderCard key={o._id} order={o} navigate={navigate} />)}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="cust-account-tabs">
          {[
            { key: 'orders',    label: '📋 Orders',    badge: active.length || null },
            { key: 'profile',   label: '👤 Profile',   badge: null },
            { key: 'addresses', label: '📍 Addresses', badge: null },
          ].map(t => (
            <button key={t.key}
              className={`cust-account-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
              {t.badge ? <span className="cust-tab-badge">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div>
            {ordersLoading && (
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ background: '#fff', borderRadius: 16, padding: '1rem', border: '1.5px solid #e2e8f0', height: 90, opacity: 0.5 + n * 0.15 }} />
                ))}
              </div>
            )}

            {!ordersLoading && orders.length === 0 && <EmptyOrders />}

            {!ordersLoading && past.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h2 style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>
                    Past Orders ({past.length})
                  </h2>
                </div>
                <div style={{ display: 'grid', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {past.map(o => (
                    <OrderHistoryCard key={o._id} order={o} navigate={navigate} onReorder={handleReorder} />
                  ))}
                </div>
              </div>
            )}

            {orders.length > 0 && (
              <Link to="/order">
                <button style={{ width: '100%', background: '#1e3a5f', border: 'none', color: '#fff', borderRadius: 12, padding: '0.85rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                  + Place New Order
                </button>
              </Link>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && user && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Personal Info</h3>
                {!editMode && (
                  <button className="sm" style={{ borderRadius: 8 }} onClick={() => setEditMode(true)}>✏ Edit</button>
                )}
              </div>
              {!editMode ? (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {[['Name', user.name], ['Phone', user.phone], ['Email', user.email || '—']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #f5f5f4', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#78716c', fontWeight: 600 }}>{k}</span>
                      <span style={{ color: '#1c1917' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '0.75rem' }}>
                  <label>Name <input value={editName} onChange={e => setEditName(e.target.value)} required /></label>
                  <label>Email <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Optional" /></label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="primary sm" style={{ borderRadius: 8 }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" className="sm" style={{ borderRadius: 8 }} onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>

            <div className="panel">
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Change Password</h3>
              <form onSubmit={handleChangePw} style={{ display: 'grid', gap: '0.75rem' }}>
                <label>Current Password <input type="password" autoComplete="current-password" value={curPw} onChange={e => setCurPw(e.target.value)} required /></label>
                <label>New Password <input type="password" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} required /></label>
                {pwMsg && <div className={pwMsg.includes('success') ? 'alert alert-success' : 'alert alert-error'}>{pwMsg}</div>}
                <button type="submit" className="primary sm" style={{ borderRadius: 8 }} disabled={pwLoading}>{pwLoading ? 'Updating…' : 'Update Password'}</button>
              </form>
            </div>

            <div className="panel" style={{ borderColor: '#fecaca' }}>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', color: '#dc2626' }}>Sign Out</h3>
              <p style={{ fontSize: '0.82rem', color: '#78716c', margin: '0 0 1rem' }}>You'll need to sign in again to access your orders.</p>
              <button className="danger sm" style={{ borderRadius: 8 }} onClick={handleLogout}>🚪 Sign Out</button>
            </div>
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {activeTab === 'addresses' && user && (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {user.addresses?.length === 0 && !showAddAddr && (
              <EmptyAddresses onAdd={() => setShowAddAddr(true)} />
            )}

            {user.addresses?.map(addr => (
              <div key={addr._id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '🏢' : '📍'}
                    {addr.label}
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#57534e' }}>{addr.addressText}</div>
                  {addr.landmark && <div style={{ fontSize: '0.78rem', color: '#a8a29e', marginTop: '0.15rem' }}>Near: {addr.landmark}</div>}
                </div>
                <button className="danger sm" style={{ borderRadius: 8, flexShrink: 0 }} onClick={() => handleDeleteAddress(addr._id)}>🗑</button>
              </div>
            ))}

            {showAddAddr ? (
              <form className="panel" onSubmit={handleAddAddress} style={{ display: 'grid', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Add Address</h3>
                <label>
                  Label
                  <select value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))}>
                    <option>Home</option><option>Work</option><option>Other</option>
                  </select>
                </label>
                <label>
                  Address <span style={{ color: '#ef4444' }}>*</span>
                  <input required placeholder="Full address" value={newAddr.addressText} onChange={e => setNewAddr(p => ({ ...p, addressText: e.target.value }))} />
                </label>
                <label>
                  Landmark
                  <input placeholder="Nearby landmark (optional)" value={newAddr.landmark} onChange={e => setNewAddr(p => ({ ...p, landmark: e.target.value }))} />
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="primary sm" style={{ borderRadius: 8 }} disabled={addingAddr}>{addingAddr ? 'Saving…' : 'Save Address'}</button>
                  <button type="button" className="sm" style={{ borderRadius: 8 }} onClick={() => setShowAddAddr(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              user.addresses?.length < 5 && user.addresses?.length > 0 && (
                <button
                  onClick={() => setShowAddAddr(true)}
                  style={{ borderRadius: 12, padding: '0.85rem', fontWeight: 700, background: 'rgba(217,119,6,0.08)', border: '1.5px dashed #d97706', color: '#d97706', fontSize: '0.9rem', cursor: 'pointer' }}>
                  + Add New Address
                </button>
              )
            )}
          </div>
        )}

        <div style={{ height: '2rem' }} />
      </div>

      <CustomerBottomNav />
    </div>
  );
};

export default CustomerAccountPage;
