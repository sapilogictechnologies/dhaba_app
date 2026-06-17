import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useGetSettingsQuery } from '../api/settingsApi.js';
import { useGetDailyReportQuery, useGetHealthQuery } from '../api/reportApi.js';
import { useGetOrdersQuery } from '../api/orderApi.js';
import { useGetExpensesQuery } from '../api/expenseApi.js';

const today = new Date().toISOString().slice(0, 10);

/* ── Metric card ── */
const MetricCard = ({ label, value, color, sub, loading, highlight }) => (
  <div className={`metric-card ${color || ''}`} style={highlight ? { borderColor: '#d97706', borderWidth: 2 } : {}}>
    <div className="label">{label}</div>
    <div className="value">{loading ? <span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }}></span> : (value ?? 0)}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '0.15rem' }}>{sub}</div>}
  </div>
);

/* ── Live count badge ── */
const LiveBadge = ({ count, label, color, bg, urgent }) => (
  <div style={{
    background: urgent && count > 0 ? bg : '#fff',
    border: `2px solid ${urgent && count > 0 ? color : '#e7e5e4'}`,
    borderRadius: 12, padding: '0.9rem 1rem',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
    transition: 'all 0.2s'
  }}>
    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: urgent && count > 0 ? color : '#1c1917', lineHeight: 1 }}>{count}</div>
    <div style={{ fontSize: '0.78rem', color: urgent && count > 0 ? color : '#78716c', fontWeight: 600 }}>{label}</div>
  </div>
);

/* ── Quick action card ── */
const QACard = ({ to, href, icon, label, primary, target }) => {
  const inner = (
    <div className={`quick-action-card ${primary ? 'primary-action' : ''}`}>
      <span className="qa-icon">{icon}</span>
      <span>{label}</span>
    </div>
  );
  if (href) return <a href={href} target={target} rel="noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>;
  return <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link>;
};

const DashboardPage = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(user?.role);
  const health = useGetHealthQuery({ pollingInterval: 60000 });
  const settings = useGetSettingsQuery();
  const report = useGetDailyReportQuery(today, { pollingInterval: 30000, skip: !isAdminOrStaff });
  const expenses = useGetExpensesQuery({ date: today }, { pollingInterval: 60000, skip: !isAdminOrStaff });
  const activeOrders = useGetOrdersQuery(
    { status: 'PLACED,UNDER_REVIEW,ACCEPTED,PREPARING,READY,OUT_FOR_DELIVERY' },
    { pollingInterval: 15000 }
  );

  const rpt = report.data?.data?.report;
  const s = settings.data?.data?.settings || {};
  const todayExpenses = expenses.data?.data?.total || 0;
  const netProfit = (rpt?.totalSales ?? 0) - todayExpenses;
  const orders = activeOrders.data?.data?.orders || [];
  const newCount      = orders.filter((o) => ['PLACED', 'UNDER_REVIEW'].includes(o.status)).length;
  const kitchenCount  = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.status)).length;
  const readyCount    = orders.filter((o) => o.status === 'READY').length;
  const deliveryCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length;

  const isApiOnline = health.isSuccess;
  const greeting = user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Dashboard';

  return (
    <section className="shell">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.1rem' }}>{greeting} 👋</h1>
          <div style={{ fontSize: '0.82rem', color: '#78716c' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`badge ${isApiOnline ? 'badge-green' : 'badge-red'}`}>
            {isApiOnline ? '🟢 API Online' : '🔴 API Offline'}
          </span>
          {s.businessOpen === false && <span className="badge badge-red">🚫 Closed</span>}
          {s.deliveryEnabled === false && <span className="badge badge-gray">🚴 Delivery Off</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#78716c' }}>
            <span className="live-dot"></span> Live
          </span>
        </div>
      </div>

      {/* ── Announcement ── */}
      {s.announcementText && (
        <div className="alert alert-warn" style={{ marginBottom: '1.25rem' }}>
          📢 {s.announcementText}
        </div>
      )}

      {/* ── Dhaba info strip ── */}
      <div className="panel" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}>
        <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🍛</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#92400e' }}>{s.dhabaName || 'My Dhaba'}</div>
          {s.address && <div style={{ fontSize: '0.82rem', color: '#78716c', marginTop: '0.1rem' }}>{s.address}</div>}
          <div style={{ fontSize: '0.8rem', color: '#78716c', marginTop: '0.1rem' }}>
            {s.phone && <span>📞 {s.phone}</span>}
            {s.upiId && <span style={{ marginLeft: '0.75rem' }}>📱 {s.upiId}</span>}
          </div>
        </div>
        <a href="/order" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <button className="sm" style={{ whiteSpace: 'nowrap' }}>Customer Page ↗</button>
        </a>
      </div>

      {/* ── Live status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>Live Status</h2>
        {activeOrders.isFetching && <span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }}></span>}
      </div>
      <div className="cards" style={{ marginBottom: '1.5rem' }}>
        <LiveBadge count={newCount}      label="New / Review"  color="#d97706" bg="#fffbeb" urgent />
        <LiveBadge count={kitchenCount}  label="In Kitchen"    color="#7c3aed" bg="#f3e8ff" urgent={false} />
        <LiveBadge count={readyCount}    label="Ready"         color="#16a34a" bg="#f0fdf4" urgent />
        <LiveBadge count={deliveryCount} label="Out for Delivery" color="#0e7490" bg="#cffafe" urgent={false} />
      </div>

      {/* ── Today's summary (Admin & Staff only) ── */}
      {isAdminOrStaff && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>Today's Summary</h2>
            {report.isFetching && <span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }}></span>}
          </div>
          <div className="cards" style={{ marginBottom: '1.5rem' }}>
            <MetricCard label="💰 Total Sales"  value={`₹${rpt?.totalSales ?? 0}`}    color="green"  highlight loading={report.isLoading} />
            <MetricCard label="💵 Cash"         value={`₹${rpt?.cashSales ?? 0}`}     loading={report.isLoading} />
            <MetricCard label="📱 UPI"          value={`₹${rpt?.upiSales ?? 0}`}      loading={report.isLoading} />
            <MetricCard label="⏳ Pending"      value={`₹${rpt?.pendingAmount ?? 0}`} color={rpt?.pendingAmount > 0 ? 'amber' : ''} loading={report.isLoading} />
            <MetricCard label="📦 Orders"       value={rpt?.totalOrders}              loading={report.isLoading} />
            <MetricCard label="🧾 Bills"        value={rpt?.totalBills}               loading={report.isLoading} />
            <MetricCard label="❌ Cancelled"    value={rpt?.cancelledOrders}          color={rpt?.cancelledOrders > 0 ? 'red' : ''} loading={report.isLoading} />
            <MetricCard label="🚴 Deliveries"   value={rpt?.onlineDeliveryOrders}     loading={report.isLoading} />
            <MetricCard label="💸 Expenses"     value={`₹${todayExpenses}`}           color={todayExpenses > 0 ? 'red' : ''} loading={expenses.isLoading} />
            <MetricCard label={netProfit >= 0 ? '📈 Profit' : '📉 Loss'} value={`₹${Math.abs(netProfit)}`} color={netProfit >= 0 ? 'green' : 'red'} highlight loading={report.isLoading || expenses.isLoading} />
          </div>
        </>
      )}

      {/* ── Quick actions by role ── */}
      {user?.role === 'ADMIN' && (
        <div>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>Quick Actions</h2>
          <div className="quick-action-grid">
            <QACard to="/admin-orders" icon="📋" label="Orders" primary />
            <QACard to="/billing"      icon="🧾" label="Billing" />
            <QACard to="/kitchen"      icon="🍳" label="Kitchen" />
            <QACard to="/tables"       icon="🪑" label="Tables" />
            <QACard to="/reports"      icon="📊" label="Reports" />
            <QACard to="/expenses"     icon="💸" label="Expenses" />
            <QACard to="/menu"         icon="🍽" label="Menu" />
            <QACard to="/realtime"     icon="📡" label="Live Feed" />
            <QACard to="/settings"     icon="⚙️" label="Settings" />
            <QACard href="/order" icon="🛍" label="Customer Page" target="_blank" />
          </div>
        </div>
      )}

      {user?.role === 'STAFF' && (
        <div>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>Quick Actions</h2>
          <div className="quick-action-grid">
            <QACard to="/staff-orders" icon="➕" label="New Order" primary />
            <QACard to="/billing"      icon="🧾" label="Billing" />
            <QACard to="/tables"       icon="🪑" label="Tables" />
            <QACard to="/menu"         icon="🍽" label="Menu" />
            <QACard to="/reports"      icon="📊" label="Reports" />
            <QACard to="/expenses"     icon="💸" label="Expenses" />
            <QACard href="/order" icon="🛍" label="Customer Page" target="_blank" />
          </div>
        </div>
      )}

      {user?.role === 'KITCHEN' && (
        <div>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>Quick Actions</h2>
          <div className="quick-action-grid">
            <QACard to="/kitchen" icon="🍳" label="Kitchen Display" primary />
            <QACard to="/menu"    icon="🍽" label="Menu / Stock" />
          </div>

          {(newCount > 0 || readyCount > 0) && (
            <div className="alert alert-warn" style={{ marginTop: '1rem' }}>
              {newCount > 0 && <div>🆕 <strong>{newCount}</strong> order{newCount > 1 ? 's' : ''} waiting to be accepted</div>}
              {readyCount > 0 && <div>✅ <strong>{readyCount}</strong> order{readyCount > 1 ? 's' : ''} ready to serve</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DashboardPage;
