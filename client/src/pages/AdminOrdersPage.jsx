import { useState } from 'react';
import {
  useAcceptOrderMutation,
  useCancelOrderMutation,
  useGetOrdersQuery,
  useRejectOrderMutation,
  useRejectPaymentMutation,
  useUpdateEtaMutation,
  useUpdateOrderStatusMutation,
  useVerifyPaymentMutation
} from '../api/orderApi.js';
import { useToast } from '../components/Toast.jsx';

const STATUS_TABS = [
  { label: 'New', statuses: 'PLACED' },
  { label: '💳 Review', statuses: 'UNDER_REVIEW' },
  { label: 'Accepted', statuses: 'ACCEPTED' },
  { label: 'Preparing', statuses: 'PREPARING' },
  { label: 'Ready', statuses: 'READY' },
  { label: 'Delivery', statuses: 'OUT_FOR_DELIVERY' },
  { label: 'Done', statuses: 'COMPLETED,DELIVERED,PICKED_UP' },
  { label: 'Closed', statuses: 'CLOSED' },
  { label: 'Cancelled', statuses: 'CANCELLED,EXPIRED' },
  { label: 'All', statuses: '' }
];

const SOURCE_LABELS = {
  WALKIN_TABLE: 'Walk-in',
  TAKEAWAY_COUNTER: 'Takeaway',
  PHONE_MANUAL: 'Phone',
  QR_TABLE: 'QR Order',
  ONLINE_PICKUP: 'Online Pickup',
  ONLINE_DELIVERY: 'Delivery'
};

const CANCEL_REASONS = [
  'Customer cancelled',
  'Item out of stock',
  'Duplicate order',
  'Kitchen busy',
  'Payment not verified',
  'Wrong table/order',
  'Other'
];

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div className="panel" style={{ width: 'min(480px, 100%)', maxHeight: '80vh', overflow: 'auto', margin: 0 }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button onClick={onClose} style={{ padding: '0.25rem 0.5rem' }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const AdminOrdersPage = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [etaValue, setEtaValue] = useState('');
  const [cancelForm, setCancelForm] = useState({ reason: '', reasonText: '' });
  const [rejectPaymentReason, setRejectPaymentReason] = useState('');
  const [rejectOrderReason, setRejectOrderReason] = useState('');

  const statusFilter = STATUS_TABS[activeTab].statuses;
  const params = {};
  if (statusFilter) params.status = statusFilter;
  if (sourceFilter) params.source = sourceFilter;
  if (dateFilter) params.date = dateFilter;

  const { data, isLoading, error } = useGetOrdersQuery(params, { pollingInterval: 15000 });
  const [acceptOrder] = useAcceptOrderMutation();
  const [rejectOrder] = useRejectOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [rejectPayment] = useRejectPaymentMutation();
  const [updateEta] = useUpdateEtaMutation();
  const [cancelOrder] = useCancelOrderMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const orders = data?.data?.orders || [];

  const act = async (fn, successMsg) => {
    try { await fn(); toast(successMsg, 'success'); }
    catch (err) { toast(err.data?.message || 'Action failed', 'error'); }
  };

  const closeModal = () => { setModal(null); setEtaValue(''); setCancelForm({ reason: '', reasonText: '' }); setRejectPaymentReason(''); setRejectOrderReason(''); };

  const apiBase = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  return (
    <section className="shell">
      <div className="page-header">
        <h1>Admin Orders</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: 'auto' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner"></span></div>}
      {error && <div className="alert alert-error">{error.data?.message || 'Failed to load orders'}</div>}

      {orders.length === 0 && !isLoading && (
        <div className="empty-state"><div className="icon">📋</div><p>No orders in this tab</p></div>
      )}

      <div className="order-grid">
        {orders.map((order) => (
          <article key={order._id} className={`order-card ${order.status === 'ACCEPTED' ? 'new-order' : order.status === 'PREPARING' ? 'preparing' : order.status === 'READY' ? 'ready' : ''}`}>
            <div className="order-header">
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span className={`badge source-${order.source}`}>{SOURCE_LABELS[order.source] || order.source}</span>
                <span className={`badge status-${order.status}`}>{order.status}</span>
                {order.tableNumber && <span className="badge badge-blue">T{order.tableNumber}</span>}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#78716c' }}>
                {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div style={{ fontWeight: 700 }}>{order.orderNo}</div>
            <div style={{ fontSize: '0.82rem', color: '#78716c' }}>{order.kotNo}</div>

            {(order.customerName || order.customerPhone) && (
              <div style={{ fontSize: '0.85rem' }}>
                {order.customerName} {order.customerPhone && `· ${order.customerPhone}`}
              </div>
            )}

            {order.delivery?.addressText && (
              <div style={{ fontSize: '0.82rem', color: '#57534e' }}>📍 {order.delivery.addressText}</div>
            )}

            <ul className="order-items">
              {order.items.map((item, i) => (
                <li key={i}><span>{item.qty}× {item.nameSnapshot}</span><span>₹{item.priceSnapshot * item.qty}</span></li>
              ))}
            </ul>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, paddingTop: '0.25rem', borderTop: '1px solid #f5f5f4' }}>
              <span>₹{order.total}</span>
              <span style={{ fontSize: '0.82rem', color: order.payment.paymentStatus === 'PAID' ? '#16a34a' : '#d97706' }}>
                {order.payment.paymentStatus} · {order.payment.method}
              </span>
            </div>

            {order.payment.proofImageUrl && (
              <a href={`${apiBase}${order.payment.proofImageUrl}`} target="_blank" rel="noreferrer"
                 style={{ fontSize: '0.8rem', color: '#2563eb' }}>📎 View payment proof</a>
            )}

            {/* Actions */}
            <div className="order-actions">
              {['PLACED', 'UNDER_REVIEW'].includes(order.status) && (
                <button className="success sm" onClick={() => act(() => acceptOrder(order._id).unwrap(), `${order.orderNo} accepted`)}>
                  ✓ Accept
                </button>
              )}
              {['PLACED', 'UNDER_REVIEW'].includes(order.status) && (
                <button className="danger sm" onClick={() => setModal({ type: 'reject', order })}>
                  ✗ Reject
                </button>
              )}
              {order.payment.paymentStatus === 'UNDER_REVIEW' && (
                <button className="success sm" onClick={() => act(() => verifyPayment(order._id).unwrap(), 'Payment verified')}>
                  💳 Verify Pay
                </button>
              )}
              {order.payment.paymentStatus === 'UNDER_REVIEW' && (
                <button className="danger sm" onClick={() => setModal({ type: 'rejectPayment', order })}>
                  ✗ Reject Pay
                </button>
              )}
              {order.status === 'READY' && order.delivery?.type === 'DELIVERY' && (
                <button className="info sm" onClick={() => act(() => updateOrderStatus({ id: order._id, status: 'OUT_FOR_DELIVERY' }).unwrap(), 'Out for delivery')}>
                  🚴 Send
                </button>
              )}
              {order.status === 'OUT_FOR_DELIVERY' && (
                <button className="sm" onClick={() => act(() => updateOrderStatus({ id: order._id, status: 'DELIVERED' }).unwrap(), 'Marked delivered')}>
                  ✓ Delivered
                </button>
              )}
              <button className="sm" onClick={() => { setModal({ type: 'eta', order }); setEtaValue(order.delivery?.etaMinutesOverride ?? ''); }}>
                ⏱ ETA
              </button>
              {!['CANCELLED', 'CLOSED', 'EXPIRED'].includes(order.status) && (
                <button className="danger sm" onClick={() => setModal({ type: 'cancel', order })}>
                  Cancel
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* ETA Modal */}
      {modal?.type === 'eta' && (
        <Modal title={`Override ETA — ${modal.order.orderNo}`} onClose={closeModal}>
          <label>ETA (minutes)
            <input type="number" value={etaValue} onChange={(e) => setEtaValue(e.target.value)} min="1" autoFocus />
          </label>
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button className="primary" onClick={() => act(
              () => updateEta({ id: modal.order._id, etaMinutesOverride: Number(etaValue) }).unwrap(),
              'ETA updated'
            ).then(closeModal)}>Save ETA</button>
            <button onClick={closeModal}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {modal?.type === 'cancel' && (
        <Modal title={`Cancel Order — ${modal.order.orderNo}`} onClose={closeModal}>
          <label>Reason
            <select value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}>
              <option value="">Select reason…</option>
              {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {cancelForm.reason === 'Other' && (
            <label style={{ marginTop: '0.75rem' }}>Custom reason
              <input value={cancelForm.reasonText} onChange={(e) => setCancelForm({ ...cancelForm, reasonText: e.target.value })} placeholder="Describe reason…" />
            </label>
          )}
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button className="danger" disabled={!cancelForm.reason} onClick={() => act(
              () => cancelOrder({ id: modal.order._id, reason: cancelForm.reason, reasonText: cancelForm.reasonText || cancelForm.reason }).unwrap(),
              'Order cancelled'
            ).then(closeModal)}>Confirm Cancel</button>
            <button onClick={closeModal}>Back</button>
          </div>
        </Modal>
      )}

      {/* Reject Order Modal */}
      {modal?.type === 'reject' && (
        <Modal title={`Reject Order — ${modal.order.orderNo}`} onClose={closeModal}>
          <label>Reason for rejection
            <input value={rejectOrderReason} onChange={(e) => setRejectOrderReason(e.target.value)} placeholder="e.g. Kitchen closed" autoFocus />
          </label>
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button className="danger" onClick={() => act(
              () => rejectOrder({ id: modal.order._id, reason: rejectOrderReason || 'Order rejected' }).unwrap(),
              'Order rejected'
            ).then(closeModal)}>Reject Order</button>
            <button onClick={closeModal}>Back</button>
          </div>
        </Modal>
      )}

      {/* Reject Payment Modal */}
      {modal?.type === 'rejectPayment' && (
        <Modal title={`Reject Payment — ${modal.order.orderNo}`} onClose={closeModal}>
          <label>Reason for rejection
            <input value={rejectPaymentReason} onChange={(e) => setRejectPaymentReason(e.target.value)} placeholder="e.g. Invalid screenshot" autoFocus />
          </label>
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button className="danger" disabled={!rejectPaymentReason} onClick={() => act(
              () => rejectPayment({ id: modal.order._id, reason: rejectPaymentReason }).unwrap(),
              'Payment rejected'
            ).then(closeModal)}>Confirm</button>
            <button onClick={closeModal}>Back</button>
          </div>
        </Modal>
      )}
    </section>
  );
};

export default AdminOrdersPage;
