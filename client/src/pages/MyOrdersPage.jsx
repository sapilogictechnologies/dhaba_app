import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetPublicMyOrdersQuery } from '../api/orderApi.js';
import { getCustomer, clearCustomer, getCustomerToken } from '../utils/customerAuth.js';

const SOURCE_LABELS = {
  WALKIN_TABLE: 'Dine-in', TAKEAWAY_COUNTER: 'Takeaway',
  PHONE_MANUAL: 'Phone', QR_TABLE: 'Table Order',
  ONLINE_PICKUP: 'Pickup', ONLINE_DELIVERY: 'Home Delivery'
};

const ACTIVE_STATUSES = ['PLACED', 'UNDER_REVIEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
const DONE_STATUSES   = ['DELIVERED', 'PICKED_UP', 'COMPLETED', 'CLOSED', 'CANCELLED', 'EXPIRED'];

const statusInfo = {
  PLACED:           { label: 'Placed',           color: '#92400e', bg: '#fef3c7' },
  UNDER_REVIEW:     { label: 'Payment Review',   color: '#c2410c', bg: '#ffedd5' },
  ACCEPTED:         { label: 'Accepted',         color: '#1d4ed8', bg: '#dbeafe' },
  PREPARING:        { label: 'Preparing',        color: '#7c3aed', bg: '#f3e8ff' },
  READY:            { label: 'Ready!',           color: '#15803d', bg: '#dcfce7' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#0e7490', bg: '#cffafe' },
  DELIVERED:        { label: 'Delivered',        color: '#15803d', bg: '#dcfce7' },
  PICKED_UP:        { label: 'Picked Up',        color: '#15803d', bg: '#dcfce7' },
  COMPLETED:        { label: 'Completed',        color: '#15803d', bg: '#dcfce7' },
  CLOSED:           { label: 'Closed',           color: '#475569', bg: '#f1f5f9' },
  CANCELLED:        { label: 'Cancelled',        color: '#dc2626', bg: '#fee2e2' },
  EXPIRED:          { label: 'Expired',          color: '#64748b', bg: '#f1f5f9' }
};

const StatusBadge = ({ status }) => {
  const info = statusInfo[status] || { label: status, color: '#475569', bg: '#f1f5f9' };
  return (
    <span style={{ background: info.bg, color: info.color, borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {info.label}
    </span>
  );
};

const OrderCard = ({ order, navigate }) => {
  const isActive   = ACTIVE_STATUSES.includes(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'EXPIRED';
  const allItems   = order.kotItemsSnapshot?.length ? order.kotItemsSnapshot : order.items;
  const preview    = allItems.slice(0, 3).map((i) => `${i.qty}× ${i.nameSnapshot || i.name}`).join(', ');

  return (
    <div
      className={`order-card-v2 ${isActive ? 'active-order' : isCancelled ? 'cancelled-order' : 'completed-order'}`}
      onClick={() => navigate(`/order-status/${order.orderNo}`)}
      role="button"
      tabIndex={0}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1c1917' }}>{order.orderNo}</span>
            <span style={{ fontSize: '0.72rem', background: '#f5f5f4', color: '#78716c', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600 }}>
              {SOURCE_LABELS[order.source] || order.source}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a8a29e', marginTop: '0.15rem' }}>
            {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <div style={{ fontSize: '0.85rem', color: '#57534e', marginBottom: '0.5rem', lineHeight: 1.4 }}>
        {preview}
        {allItems.length > 3 && <span style={{ color: '#a8a29e' }}> +{allItems.length - 3} more</span>}
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontWeight: 700, color: '#d97706', fontSize: '1rem' }}>₹{order.total}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isActive && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
              <span className="live-dot" style={{ width: 7, height: 7 }}></span>
              Live
            </span>
          )}
          <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>Track →</span>
        </div>
      </div>
    </div>
  );
};

const MyOrdersPage = () => {
  const navigate    = useNavigate();
  const customer    = useMemo(() => getCustomer(), []);
  const customerToken = useMemo(() => getCustomerToken(), []);
  const { token: reduxToken } = useSelector((s) => s.customerAuth);
  const isLoggedIn  = !!(reduxToken || customerToken);

  // If logged in, redirect to full account page
  useEffect(() => {
    if (isLoggedIn) navigate('/customer/account', { replace: true });
  }, [isLoggedIn, navigate]);

  const [phone, setPhone]       = useState(customer?.phone || '');
  const [searched, setSearched] = useState(!!customer);
  const customerKey = localStorage.getItem('dhabaCustomerKey') || '';

  const { data, isLoading, error, refetch } = useGetPublicMyOrdersQuery(
    { phone, customerKey },
    { skip: !searched || !phone }
  );

  // Auto-refresh every 30s if there are active orders
  useEffect(() => {
    if (!searched) return;
    const id = setInterval(refetch, 30000);
    return () => clearInterval(id);
  }, [searched, refetch]);

  const orders     = data?.data?.orders || [];
  const active     = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const past       = orders.filter((o) => DONE_STATUSES.includes(o.status));

  const doSearch = (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSearched(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div className="cust-header no-print">
        <Link to="/order" className="cust-header-brand">
          <span style={{ fontSize: '1.3rem' }}>🍛</span>
          <span>My Orders</span>
        </Link>
        <div className="cust-header-actions">
          <Link to="/customer/login">
            <button className="cust-header-btn">Sign In / Register</button>
          </Link>
          <Link to="/order">
            <button className="cust-header-btn">+ New Order</button>
          </Link>
        </div>
      </div>

      <div className="public-page" style={{ paddingTop: '1.25rem' }}>
        {/* Welcome back */}
        {customer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Welcome back, {customer.name.split(' ')[0]}! 👋</h1>
              <div style={{ fontSize: '0.8rem', color: '#78716c', marginTop: '0.15rem' }}>📞 {customer.phone}</div>
            </div>
            <button className="sm danger" style={{ fontSize: '0.75rem' }}
              onClick={() => { clearCustomer(); setPhone(''); setSearched(false); }}>
              🚪 Sign out
            </button>
          </div>
        )}

        {!customer && (
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>📋</div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.35rem' }}>My Orders</h1>
            <p style={{ color: '#78716c', fontSize: '0.875rem', margin: 0 }}>Enter your phone number to find your orders</p>
          </div>
        )}

        {/* Phone search form */}
        {!customer && (
          <form className="panel" onSubmit={doSearch} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <label style={{ flex: 1, margin: 0 }}>
                Phone Number
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setSearched(false); }}
                  placeholder="Enter your mobile number"
                  autoComplete="tel"
                  required
                />
              </label>
              <button type="submit" className="primary" style={{ flexShrink: 0, borderRadius: 8 }}>
                🔍 Find
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#78716c', margin: '0.5rem 0 0' }}>
              Uses your phone + device ID to show your order history.
            </p>
          </form>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="spinner" style={{ width: '1.75rem', height: '1.75rem', borderWidth: 3 }}></span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error">{error.data?.message || 'Could not load orders'}</div>
        )}

        {/* No orders found */}
        {searched && !isLoading && !error && orders.length === 0 && (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <p>No orders found for this phone number.</p>
            <Link to="/order"><button className="primary" style={{ marginTop: '0.75rem', borderRadius: 10 }}>Place New Order</button></Link>
          </div>
        )}

        {/* Active orders */}
        {active.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <h2 style={{ margin: 0, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>
                Active Orders
              </h2>
              <span className="live-dot"></span>
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Live</span>
            </div>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {active.map((o) => <OrderCard key={o._id} order={o} navigate={navigate} />)}
            </div>
          </div>
        )}

        {/* Past orders */}
        {past.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>
              Past Orders
            </h2>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {past.map((o) => <OrderCard key={o._id} order={o} navigate={navigate} />)}
            </div>
          </div>
        )}

        {/* Place new order CTA */}
        {(searched && orders.length > 0) && (
          <Link to="/order">
            <button className="primary w-full" style={{ borderRadius: 12, padding: '0.85rem', fontWeight: 700, fontSize: '1rem' }}>
              + Place New Order
            </button>
          </Link>
        )}

        <div style={{ height: '1.5rem' }} />
      </div>
    </div>
  );
};

export default MyOrdersPage;
