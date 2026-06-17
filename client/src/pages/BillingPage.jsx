import { useMemo, useRef, useState } from 'react';
import { useGetOrdersQuery, useRecordPaymentMutation, useUpdateOrderStatusMutation } from '../api/orderApi.js';
import { useGetSettingsQuery } from '../api/settingsApi.js';
import { useToast } from '../components/Toast.jsx';

const SOURCE_LABELS = {
  WALKIN_TABLE: 'Walk-in', TAKEAWAY_COUNTER: 'Takeaway',
  PHONE_MANUAL: 'Phone', QR_TABLE: 'QR Table',
  ONLINE_PICKUP: 'Pickup', ONLINE_DELIVERY: 'Delivery'
};

const PayMethodBtn = ({ value, icon, label, active, onClick }) => (
  <div className={`pay-method-btn ${active ? 'active' : ''}`} onClick={onClick} role="button">
    <span className="pm-icon">{icon}</span>
    {label}
  </div>
);

const BillingPage = () => {
  const toast = useToast();
  const { data, isLoading, error } = useGetOrdersQuery(
    { status: 'ACCEPTED,PREPARING,READY,COMPLETED,DELIVERED,PICKED_UP' },
    { pollingInterval: 15000 }
  );
  const settingsQuery = useGetSettingsQuery();
  const [recordPayment, paymentState] = useRecordPaymentMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ method: 'CASH', paidAmount: '', utr: '' });
  const printRef = useRef(null);

  const orders = data?.data?.orders || [];
  const s = settingsQuery.data?.data?.settings || {};
  const selected = useMemo(() => orders.find((o) => o._id === selectedId), [orders, selectedId]);

  const selectOrder = (order) => {
    setSelectedId(order._id);
    setForm({ method: 'CASH', paidAmount: String(order.total - (order.payment?.paidAmount || 0)), utr: '' });
  };

  const remainingDue = selected ? (selected.total - (selected.payment?.paidAmount || 0)) : 0;
  const newPaid = Number(form.paidAmount) || 0;
  const balanceAfter = Math.max(0, remainingDue - newPaid);
  const willFullyPay = balanceAfter <= 0 && newPaid > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!newPaid || newPaid <= 0) return toast('Enter a valid payment amount', 'warn');
    try {
      await recordPayment({
        id: selectedId,
        method: form.method,
        paidAmount: newPaid,
        utr: form.utr,
        closeOrder: willFullyPay
      }).unwrap();
      toast('Payment recorded ✓', 'success');
      // if paid in full auto-close — refetch will update
      if (willFullyPay) setSelectedId('');
    } catch (err) {
      toast(err?.data?.message || 'Payment failed', 'error');
    }
  };

  const markFulfilled = async () => {
    if (!selected) return;
    const nextStatus = selected.delivery?.type === 'PICKUP' ? 'PICKED_UP' : 'COMPLETED';
    try {
      await updateOrderStatus({ id: selected._id, status: nextStatus }).unwrap();
      toast(`Order marked ${nextStatus.replace(/_/g, ' ')}`, 'success');
    } catch (err) { toast(err?.data?.message || 'Failed', 'error'); }
  };

  const closeOrder = async () => {
    if (!selected) return;
    try {
      await updateOrderStatus({ id: selected._id, status: 'CLOSED' }).unwrap();
      toast('Order closed', 'success');
      setSelectedId('');
    } catch (err) { toast(err?.data?.message || 'Failed', 'error'); }
  };

  return (
    <section className="shell">
      <div className="page-header">
        <h1>Billing</h1>
        <button className="sm no-print" onClick={() => window.print()} disabled={!selected}>🖨 Print Bill</button>
      </div>

      {error && <div className="alert alert-error">{error?.data?.message || 'Failed to load orders'}</div>}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>

        {/* ── Left: Order list ── */}
        <div className="no-print">
          <div style={{ color: '#78716c', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
            Active Orders ({orders.length})
          </div>
          {isLoading && <div style={{ textAlign: 'center', padding: '1.5rem' }}><span className="spinner"></span></div>}
          <div style={{ display: 'grid', gap: '0.5rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {orders.map((order) => {
              const isPaid = order.payment?.paymentStatus === 'PAID';
              const hasPending = (order.payment?.balanceAmount ?? 0) > 0;
              return (
                <button
                  key={order._id}
                  onClick={() => selectOrder(order)}
                  style={{
                    textAlign: 'left', padding: '0.85rem 1rem', borderRadius: 12,
                    border: `2px solid ${selectedId === order._id ? '#d97706' : '#e7e5e4'}`,
                    background: selectedId === order._id ? '#fffbeb' : '#fff',
                    cursor: 'pointer', width: '100%', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.3rem' }}>
                    <span>{order.orderNo}</span>
                    <span style={{ color: '#d97706' }}>₹{order.total}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span className={`badge status-${order.status}`}>{order.status.replace(/_/g, ' ')}</span>
                    <span className={`badge source-${order.source}`}>{SOURCE_LABELS[order.source] || order.source}</span>
                    {order.tableNumber && <span style={{ color: '#78716c' }}>Table {order.tableNumber}</span>}
                    {order.customerName && <span style={{ color: '#78716c' }}>{order.customerName}</span>}
                    {hasPending && !isPaid && (
                      <span style={{ marginLeft: 'auto', color: '#dc2626', fontWeight: 700 }}>₹{order.payment.balanceAmount} due</span>
                    )}
                    {isPaid && <span style={{ marginLeft: 'auto', color: '#16a34a', fontWeight: 700 }}>✓ Paid</span>}
                  </div>
                </button>
              );
            })}
            {orders.length === 0 && !isLoading && (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="icon">🧾</div>
                <p>No active orders to bill</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Bill + Payment ── */}
        <div>
          {selected ? (
            <>
              {/* ── Bill preview (printable) ── */}
              <div className="panel" ref={printRef} id="bill-print-area" style={{ fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{s.dhabaName || 'Dhaba'}</div>
                  {s.address && <div style={{ fontSize: '0.82rem', color: '#78716c' }}>{s.address}</div>}
                  {s.phone && <div style={{ fontSize: '0.82rem', color: '#78716c' }}>📞 {s.phone}</div>}
                </div>
                <hr className="divider" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.8rem', color: '#78716c', gap: '0.2rem', marginBottom: '0.5rem' }}>
                  <span><strong>Bill:</strong> {selected.billNo || '—'}</span>
                  <span style={{ textAlign: 'right' }}>{new Date(selected.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span><strong>Order:</strong> {selected.orderNo}</span>
                  <span style={{ textAlign: 'right' }}><strong>KOT:</strong> {selected.kotNo}</span>
                </div>
                {selected.tableNumber && <div style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}>Table: <strong>{selected.tableNumber}</strong></div>}
                {selected.customerName && (
                  <div style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                    Customer: <strong>{selected.customerName}</strong>
                    {selected.customerPhone && <span> · {selected.customerPhone}</span>}
                  </div>
                )}

                <hr className="divider" />
                <table style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingLeft: 0 }}>Item</th>
                      <th style={{ textAlign: 'right', width: 36 }}>Qty</th>
                      <th style={{ textAlign: 'right', width: 56 }}>Rate</th>
                      <th style={{ textAlign: 'right', width: 60 }}>Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ paddingLeft: 0 }}>{item.nameSnapshot}</td>
                        <td style={{ textAlign: 'right' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.priceSnapshot}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.priceSnapshot * item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <hr className="divider" />

                {/* Totals */}
                <div style={{ fontSize: '0.875rem', display: 'grid', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{selected.subtotal}</span></div>
                  {selected.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Discount</span><span>−₹{selected.discount}</span></div>}
                  {selected.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>₹{selected.tax}</span></div>}
                  {selected.deliveryCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery</span><span>₹{selected.deliveryCharge}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid #e7e5e4', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
                    <span>TOTAL</span><span>₹{selected.total}</span>
                  </div>
                  {selected.payment.paidAmount > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                        <span>Paid ({selected.payment.method})</span><span>₹{selected.payment.paidAmount}</span>
                      </div>
                      {selected.payment.balanceAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 }}>
                          <span>Balance Due</span><span>₹{selected.payment.balanceAmount}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {s.upiId && <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem', color: '#78716c' }}>UPI: {s.upiId}</div>}
                <div style={{ textAlign: 'center', marginTop: '0.35rem', fontSize: '0.72rem', color: '#a8a29e' }}>Thank you, visit again! 🙏</div>
              </div>

              {/* ── Payment form ── */}
              <form className="panel no-print" onSubmit={submit}>
                <h3 style={{ marginBottom: '0.85rem' }}>
                  Record Payment
                  {selected.payment?.paymentStatus === 'PAID'
                    ? <span className="badge badge-green" style={{ marginLeft: '0.5rem' }}>✓ Fully Paid</span>
                    : remainingDue > 0
                      ? <span className="badge badge-amber" style={{ marginLeft: '0.5rem' }}>₹{remainingDue} due</span>
                      : null
                  }
                </h3>

                {/* Payment method visual selector */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Payment Method</div>
                  <div className="pay-method-grid">
                    <PayMethodBtn value="CASH" icon="💵" label="Cash" active={form.method === 'CASH'} onClick={() => setForm({ ...form, method: 'CASH', utr: '' })} />
                    <PayMethodBtn value="UPI" icon="📱" label="UPI" active={form.method === 'UPI'} onClick={() => setForm({ ...form, method: 'UPI' })} />
                    <PayMethodBtn value="MIXED" icon="🔀" label="Mixed" active={form.method === 'MIXED'} onClick={() => setForm({ ...form, method: 'MIXED' })} />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
                  <label>Amount Received (₹)
                    <input
                      type="number"
                      value={form.paidAmount}
                      onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                      min="0"
                      max={remainingDue}
                      placeholder={`Max ₹${remainingDue}`}
                      style={{ fontSize: '1.1rem', fontWeight: 700 }}
                    />
                  </label>
                  {(form.method === 'UPI' || form.method === 'MIXED') && (
                    <label>UPI UTR / Transaction ID
                      <input
                        value={form.utr}
                        onChange={(e) => setForm({ ...form, utr: e.target.value })}
                        placeholder="12-digit UTR"
                      />
                    </label>
                  )}
                </div>

                {/* Balance indicator */}
                {newPaid > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 1rem', borderRadius: 10, marginBottom: '0.75rem',
                    background: willFullyPay ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${willFullyPay ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: willFullyPay ? '#15803d' : '#dc2626' }}>
                      {willFullyPay ? '✓ Fully paid' : `Balance remaining:`}
                    </span>
                    {!willFullyPay && (
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>₹{balanceAfter}</span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="primary w-full"
                    style={{ padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: 10 }}
                    disabled={paymentState.isLoading || !newPaid}
                  >
                    {paymentState.isLoading ? 'Saving…' : willFullyPay ? '✓ Mark Paid & Close' : `Record ₹${newPaid} Payment`}
                  </button>

                  {selected.status === 'READY' && (
                    <button type="button" className="success w-full" style={{ padding: '0.65rem', borderRadius: 10 }} onClick={markFulfilled}>
                      {selected.delivery?.type === 'PICKUP' ? '🛍 Mark Picked Up' : '✓ Mark Completed'}
                    </button>
                  )}

                  {['DELIVERED', 'PICKED_UP', 'COMPLETED'].includes(selected.status)
                    && selected.payment.paymentStatus === 'PAID' && (
                    <button type="button" className="w-full" style={{ padding: '0.65rem', borderRadius: 10 }} onClick={closeOrder}>
                      🧾 Close Order
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="empty-state panel no-print" style={{ padding: '3rem' }}>
              <div className="icon">←</div>
              <p>Select an order from the list to view the bill</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BillingPage;
