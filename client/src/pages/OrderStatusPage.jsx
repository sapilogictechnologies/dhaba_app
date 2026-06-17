import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useGetPublicOrderQuery } from '../api/orderApi.js';
import { useDispatch } from 'react-redux';
import { baseApi } from '../api/baseApi.js';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const STATUS_STEPS = [
  { status: 'PLACED',           label: 'Order Placed',       icon: '📋', desc: 'Your order has been received' },
  { status: 'UNDER_REVIEW',     label: 'Payment Review',     icon: '💳', desc: 'Verifying your UPI payment' },
  { status: 'ACCEPTED',         label: 'Order Accepted',     icon: '✅', desc: 'Confirmed and in the queue' },
  { status: 'PREPARING',        label: 'Preparing',          icon: '🍳', desc: 'Chef is cooking your order' },
  { status: 'READY',            label: 'Ready!',             icon: '🛎', desc: 'Your order is ready to go' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery',   icon: '🚴', desc: 'On the way to you' },
  { status: 'DELIVERED',        label: 'Delivered',          icon: '🏠', desc: 'Delivered! Enjoy your meal 🎉' },
  { status: 'PICKED_UP',        label: 'Picked Up',          icon: '🛍', desc: 'Collected! Enjoy your meal 🎉' },
  { status: 'COMPLETED',        label: 'Served',             icon: '🍽', desc: 'Enjoy your meal! 🎉' },
  { status: 'CLOSED',           label: 'Closed',             icon: '🧾', desc: 'Order complete and paid' }
];

const TERMINAL = ['CANCELLED', 'EXPIRED', 'CLOSED', 'DELIVERED', 'PICKED_UP', 'COMPLETED'];

const STATUS_NOTIFICATIONS = {
  UNDER_REVIEW:     { msg: '⏳ Payment under review — we\'ll confirm shortly', type: 'warn' },
  ACCEPTED:         { msg: '✅ Order confirmed! Going to kitchen', type: 'success' },
  PREPARING:        { msg: '🍳 Chef started preparing your order', type: 'info' },
  READY:            { msg: '🛎 Your order is READY! Come and get it.', type: 'success' },
  OUT_FOR_DELIVERY: { msg: '🚴 Your order is out for delivery!', type: 'info' },
  DELIVERED:        { msg: '🏠 Order delivered! Enjoy your meal.', type: 'success' },
  PICKED_UP:        { msg: '🛍 Order picked up! Enjoy your meal.', type: 'success' },
  COMPLETED:        { msg: '🍽 Order served! Enjoy your meal.', type: 'success' },
  CANCELLED:        { msg: '❌ Order was cancelled.', type: 'error' }
};

const getStepsForOrder = (order) => {
  const dt = order?.delivery?.type;
  if (dt === 'DELIVERY') return STATUS_STEPS.filter((s) => !['PICKED_UP', 'COMPLETED'].includes(s.status));
  if (dt === 'PICKUP')   return STATUS_STEPS.filter((s) => !['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(s.status));
  return STATUS_STEPS.filter((s) => !['UNDER_REVIEW', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(s.status));
};

const getStepState = (stepStatus, currentStatus) => {
  const all = STATUS_STEPS.map((s) => s.status);
  const si  = all.indexOf(stepStatus);
  const ci  = all.indexOf(currentStatus);
  if (si < ci) return 'done';
  if (si === ci) return 'current';
  return 'upcoming';
};

const SOURCE_LABELS = {
  WALKIN_TABLE: 'Dine-in', TAKEAWAY_COUNTER: 'Takeaway',
  PHONE_MANUAL: 'Phone Order', QR_TABLE: 'Table Order',
  ONLINE_PICKUP: 'Pickup', ONLINE_DELIVERY: 'Home Delivery'
};

const useElapsed = (dateStr) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

/* ── Inline toast for this page ── */
const usePageToast = () => {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };
  return { toasts, add };
};

const OrderStatusPage = () => {
  const { orderNo }  = useParams();
  const dispatch     = useDispatch();
  const { data, isLoading, error, refetch } = useGetPublicOrderQuery(orderNo, { pollingInterval: 30000 });
  const [connected, setConnected]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const prevStatus  = useRef(null);
  const { toasts, add: addToast } = usePageToast();

  const order       = data?.data?.order;
  const customerKey = localStorage.getItem('dhabaCustomerKey') || '';
  const elapsed     = useElapsed(order?.createdAt);

  useEffect(() => {
    if (!orderNo) return;
    const socket = io(socketUrl, { reconnectionDelay: 2000 });
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.emit('join:order', { orderNo, customerKey });

    const refresh = (evt) => {
      if (evt?.orderNo === orderNo || !evt?.orderNo) {
        dispatch(baseApi.util.invalidateTags(['Orders']));
        refetch();
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    };
    socket.on('order:update', refresh);
    socket.on('order:status_changed', refresh);
    return () => socket.disconnect();
  }, [orderNo, customerKey, dispatch, refetch]);

  // Show toast when status changes
  useEffect(() => {
    if (!order) return;
    if (prevStatus.current && prevStatus.current !== order.status) {
      const notif = STATUS_NOTIFICATIONS[order.status];
      if (notif) addToast(notif.msg, notif.type);
    }
    prevStatus.current = order.status;
  }, [order?.status]); // eslint-disable-line

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--cream)' }}>
      <span className="spinner" style={{ width: '2.5rem', height: '2.5rem', borderWidth: 3 }}></span>
    </div>
  );

  if (error || !order) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😕</div>
        <h2>Order not found</h2>
        <p style={{ color: '#78716c' }}>Order: {orderNo}</p>
        <Link to="/order"><button className="primary" style={{ marginTop: '1rem', borderRadius: 10 }}>Place New Order</button></Link>
      </div>
    </div>
  );

  const steps      = getStepsForOrder(order);
  const eta        = order.delivery?.etaMinutesOverride ?? order.delivery?.etaMinutesCalculated;
  const isCancelled = order.status === 'CANCELLED';
  const isExpired   = order.status === 'EXPIRED';
  const isDone      = TERMINAL.includes(order.status);
  const currentStep = STATUS_STEPS.find((s) => s.status === order.status);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', paddingBottom: '2rem' }}>
      {/* Page toasts */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 'calc(100vw - 2rem)' }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} style={{ minWidth: 0 }}>{t.msg}</div>
        ))}
      </div>

      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--gold)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Link to="/order" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>← Menu</Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '0.9rem' }}>🍛 Order Status</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: connected ? '#4ade80' : '#f87171', fontWeight: 600 }}>
          <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          {connected ? 'Live' : 'Reconnecting…'}
          {lastUpdated && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>· {lastUpdated}</span>}
        </div>
      </div>

      <div className="public-page" style={{ paddingTop: '1.25rem' }}>
        {/* Hero status card */}
        <div style={{
          background: isCancelled || isExpired
            ? 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)'
            : isDone
            ? 'linear-gradient(135deg, #052e16 0%, #14532d 100%)'
            : 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
          borderRadius: 20, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem', color: '#fff'
        }}>
          <div style={{ fontSize: '2.75rem', marginBottom: '0.4rem' }}>{currentStep?.icon || '📋'}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: isDone && !isCancelled ? '#86efac' : isCancelled ? '#fca5a5' : 'var(--gold-light)', marginBottom: '0.2rem' }}>
            {currentStep?.label || order.status.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem' }}>
            {currentStep?.desc || ''}
          </div>

          {/* Order info row */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: 'var(--gold-light)', borderRadius: 999, padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 700 }}>
              {order.orderNo}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 999, padding: '0.2rem 0.7rem', fontSize: '0.78rem' }}>
              {SOURCE_LABELS[order.source] || order.source}
              {order.tableNumber && ` · Table ${order.tableNumber}`}
            </span>
          </div>

          {elapsed && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Placed {elapsed}</div>
          )}
        </div>

        {/* ETA banner */}
        {eta > 0 && !isDone && (
          <div className="alert alert-info" style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>
            ⏱ Estimated time: <strong>{eta} minutes</strong>
            {order.delivery?.etaMinutesOverride && (
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#78716c', marginLeft: '0.5rem' }}>(updated by staff)</span>
            )}
          </div>
        )}

        {/* Cancelled/expired */}
        {(isCancelled || isExpired) && (
          <div className="alert alert-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {isCancelled ? '❌ Order Cancelled' : '⏰ Order Expired'}
            {order.cancelReasonText && <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', fontWeight: 400 }}>{order.cancelReasonText}</div>}
          </div>
        )}

        {/* Payment status */}
        {order.payment?.paymentStatus && order.payment.paymentStatus !== 'UNPAID' && (
          <div className={`alert ${order.payment.paymentStatus === 'PAID' ? 'alert-success' : order.payment.paymentStatus === 'UNDER_REVIEW' ? 'alert-warn' : 'alert-error'}`}
            style={{ marginBottom: '1rem' }}>
            {order.payment.paymentStatus === 'PAID'         && '✓ Payment Confirmed'}
            {order.payment.paymentStatus === 'UNDER_REVIEW' && '⏳ Payment Under Review — we\'ll confirm shortly'}
            {order.payment.paymentStatus === 'REJECTED'     && `❌ Payment Rejected${order.payment.rejectionReason ? ': ' + order.payment.rejectionReason : ''}`}
          </div>
        )}

        {/* Status timeline */}
        {!isCancelled && !isExpired && (
          <div className="panel" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.85rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c' }}>
              Order Progress
            </h3>
            <div className="status-timeline">
              {steps.map((step) => {
                const state = getStepState(step.status, order.status);
                return (
                  <div key={step.status} className={`status-step ${state}`}>
                    <div className="dot" />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: state === 'current' ? 700 : 500,
                        fontSize:   state === 'current' ? '0.95rem' : '0.875rem',
                        color:      state === 'upcoming' ? '#a8a29e' : '#1c1917',
                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}>
                        <span>{step.icon}</span>
                        <span>{step.label}</span>
                        {state === 'current' && <span className="live-dot" style={{ width: 7, height: 7 }} />}
                      </div>
                      {state === 'current' && (
                        <div style={{ fontSize: '0.8rem', color: '#78716c', marginTop: '0.1rem' }}>{step.desc}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.65rem' }}>Order Summary</h3>
          <ul className="order-items">
            {(order.kotItemsSnapshot?.length ? order.kotItemsSnapshot : order.items).map((item, i) => {
              const price = item.priceSnapshot ?? order.items.find((x) => String(x.itemId) === String(item.itemId))?.priceSnapshot;
              return (
                <li key={i} style={{ padding: '0.4rem 0' }}>
                  <span style={{ fontWeight: 600 }}>{item.qty}× {item.nameSnapshot || item.name}</span>
                  {item.itemNotes && <div style={{ fontSize: '0.72rem', color: '#78716c', fontStyle: 'italic' }}>{item.itemNotes}</div>}
                  {price && <span style={{ color: '#78716c' }}>₹{price * item.qty}</span>}
                </li>
              );
            })}
          </ul>
          <div style={{ borderTop: '1px solid #e7e5e4', marginTop: '0.5rem', paddingTop: '0.5rem', fontSize: '0.875rem', display: 'grid', gap: '0.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            {order.deliveryCharge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}><span>Delivery</span><span>₹{order.deliveryCharge}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#d97706', marginTop: '0.2rem' }}>
              <span>Total</span><span>₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        {(order.customerName || order.delivery?.addressText) && (
          <div className="panel" style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#57534e' }}>
            {order.customerName && (
              <div style={{ marginBottom: '0.3rem' }}>
                👤 <strong>{order.customerName}</strong>
                {order.customerPhone && <span style={{ color: '#78716c', marginLeft: '0.5rem' }}>{order.customerPhone}</span>}
              </div>
            )}
            {order.delivery?.addressText && (
              <div>
                📍 {order.delivery.addressText}
                {order.delivery.landmark && <span style={{ color: '#78716c' }}> · {order.delivery.landmark}</span>}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <Link to="/my-orders">
            <button className="w-full" style={{ borderRadius: 10, padding: '0.75rem' }}>📋 View All My Orders</button>
          </Link>
          <Link to="/order">
            <button className="primary w-full" style={{ borderRadius: 10, padding: '0.75rem', fontWeight: 700 }}>
              + Place New Order
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;
