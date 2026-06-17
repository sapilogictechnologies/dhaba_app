import { useState } from 'react';
import { useGetMenuQuery } from '../api/menuApi.js';
import { useGetTablesQuery } from '../api/tableApi.js';
import {
  useCreatePhoneOrderMutation,
  useCreateTableOrderMutation,
  useCreateTakeawayOrderMutation,
  useGetOrdersQuery,
  useMergeOrdersMutation,
  useMoveTableMutation,
  useCancelOrderMutation
} from '../api/orderApi.js';
import { useToast } from '../components/Toast.jsx';

const SOURCE_LABELS = {
  WALKIN_TABLE: 'Walk-in', TAKEAWAY_COUNTER: 'Takeaway',
  PHONE_MANUAL: 'Phone', QR_TABLE: 'QR', ONLINE_PICKUP: 'Pickup', ONLINE_DELIVERY: 'Delivery'
};

const CANCEL_REASONS = ['Customer cancelled', 'Item out of stock', 'Duplicate order', 'Kitchen busy', 'Other'];

const selectedItems = (quantities, notes) =>
  Object.entries(quantities)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([itemId, qty]) => ({ itemId, qty: Number(qty), itemNotes: notes[itemId] || '' }));

const StaffOrdersPage = () => {
  const toast = useToast();
  const menuQuery = useGetMenuQuery();
  const tablesQuery = useGetTablesQuery();
  const ordersQuery = useGetOrdersQuery({ status: 'ACCEPTED,PREPARING,READY,PLACED,UNDER_REVIEW' }, { pollingInterval: 20000 });
  const [createTableOrder, tableState] = useCreateTableOrderMutation();
  const [createTakeawayOrder, takeawayState] = useCreateTakeawayOrderMutation();
  const [createPhoneOrder, phoneState] = useCreatePhoneOrderMutation();
  const [moveTable] = useMoveTableMutation();
  const [mergeOrders] = useMergeOrdersMutation();
  const [cancelOrder] = useCancelOrderMutation();

  const [mode, setMode] = useState('TABLE');
  const [activeTab, setActiveTab] = useState('new');
  const [qty, setQty] = useState({});
  const [itemNotes, setItemNotes] = useState({});
  const [activeCategory, setActiveCategory] = useState('');
  const [form, setForm] = useState({ tableId: '', customerName: '', customerPhone: '', notes: '', deliveryType: 'PICKUP', distanceKm: '', addressText: '' });
  const [moveForm, setMoveForm] = useState({ id: '', toTableNumber: '' });
  const [mergeForm, setMergeForm] = useState({ id: '', targetOrderId: '' });
  const [cancelForm, setCancelForm] = useState({ id: '', reason: '' });
  const [lastOrder, setLastOrder] = useState(null);

  const menu = menuQuery.data?.data?.menu || [];
  const tables = tablesQuery.data?.data?.tables || [];
  const orders = ordersQuery.data?.data?.orders || [];
  const categories = [...new Set(menu.map((i) => i.category))];
  const freeTables = tables.filter((t) => t.isActive && !t.currentOrderId);
  const filteredMenu = activeCategory ? menu.filter((i) => i.category === activeCategory) : menu;

  const adjustQty = (itemId, delta) => setQty((prev) => ({ ...prev, [itemId]: Math.max(0, (Number(prev[itemId]) || 0) + delta) }));

  const submit = async (e) => {
    e.preventDefault();
    const items = selectedItems(qty, itemNotes);
    if (items.length === 0) return toast('Add at least one item', 'warn');
    const body = { items, customerName: form.customerName, customerPhone: form.customerPhone, notes: form.notes };
    try {
      let result;
      if (mode === 'TABLE') result = await createTableOrder({ ...body, tableId: form.tableId }).unwrap();
      if (mode === 'TAKEAWAY') result = await createTakeawayOrder(body).unwrap();
      if (mode === 'PHONE') result = await createPhoneOrder({ ...body, delivery: { type: form.deliveryType, distanceKm: form.deliveryType === 'DELIVERY' ? parseFloat(form.distanceKm) || 0 : undefined, addressText: form.addressText } }).unwrap();
      setLastOrder(result.data.order);
      setQty({}); setItemNotes({});
      toast(`Order ${result.data.order.orderNo} created → Kitchen`, 'success');
    } catch (err) { toast(err.data?.message || 'Order failed', 'error'); }
  };

  const act = async (fn, msg) => {
    try { await fn(); toast(msg, 'success'); }
    catch (err) { toast(err.data?.message || 'Failed', 'error'); }
  };

  const isLoading = tableState.isLoading || takeawayState.isLoading || phoneState.isLoading;

  return (
    <section className="shell">
      <div className="page-header"><h1>Staff Orders</h1></div>

      {/* Tabs */}
      <div className="tabs">
        {[['new', '+ New Order'], ['active', `Active (${orders.length})`], ['move', 'Move Table'], ['merge', 'Merge'], ['cancel', 'Cancel']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {/* NEW ORDER */}
      {activeTab === 'new' && (
        <form onSubmit={submit}>
          <div className="segmented">
            {[['TABLE', '🪑 Table'], ['TAKEAWAY', '📦 Takeaway'], ['PHONE', '📞 Phone']].map(([v, l]) => (
              <button key={v} type="button" className={mode === v ? 'active' : ''} onClick={() => setMode(v)}>{l}</button>
            ))}
          </div>

          <div className="panel">
            <div className="form-grid">
              {mode === 'TABLE' && (
                <label>Table *
                  <select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })} required>
                    <option value="">Select table</option>
                    {freeTables.map((t) => <option key={t._id} value={t._id}>Table {t.tableNumber} (Cap {t.capacity})</option>)}
                    {tables.filter((t) => t.isActive && t.currentOrderId).map((t) => <option key={t._id} value={t._id} style={{ color: '#d97706' }}>Table {t.tableNumber} ⚠ Has Order</option>)}
                  </select>
                </label>
              )}
              <label>Customer Name
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </label>
              <label>Phone
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </label>
              <label>Order Notes
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Special instructions…" />
              </label>
              {mode === 'PHONE' && (
                <>
                  <label>Fulfilment
                    <select value={form.deliveryType} onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}>
                      <option value="PICKUP">Pickup</option>
                      <option value="DELIVERY">Delivery</option>
                    </select>
                  </label>
                  {form.deliveryType === 'DELIVERY' && (
                    <>
                      <label>Distance (km)
                        <input type="number" value={form.distanceKm} step="0.1" min="0.1" max="10" placeholder="e.g. 1.5" onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
                      </label>
                      <label>Address
                        <input value={form.addressText} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
                      </label>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', padding: '0.25rem 0 0.75rem', scrollbarWidth: 'none' }}>
            <button type="button" className={!activeCategory ? 'primary sm' : 'sm'} onClick={() => setActiveCategory('')}>All</button>
            {categories.map((cat) => (
              <button key={cat} type="button" className={activeCategory === cat ? 'primary sm' : 'sm'} onClick={() => setActiveCategory(cat)} style={{ whiteSpace: 'nowrap' }}>{cat}</button>
            ))}
          </div>

          {/* Menu items */}
          <div className="menu-select">
            {filteredMenu.map((item) => {
              const count = Number(qty[item._id]) || 0;
              const isOos = item.stockStatus === 'OUT_OF_STOCK' || !item.isAvailable;
              return (
                <div key={item._id} className={`item-select ${isOos ? 'out-of-stock' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                    {isOos && <span className="badge badge-red">Out of stock</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#78716c' }}>
                    <span>{item.category}</span>
                    <span>₹{item.price}</span>
                  </div>
                  <div className="qty-stepper">
                    <button type="button" onClick={() => adjustQty(item._id, -1)} disabled={count === 0}>−</button>
                    <span>{count}</span>
                    <button type="button" onClick={() => adjustQty(item._id, 1)} disabled={isOos}>+</button>
                  </div>
                  {count > 0 && (
                    <input value={itemNotes[item._id] || ''} placeholder="Item notes…"
                      onChange={(e) => setItemNotes({ ...itemNotes, [item._id]: e.target.value })} style={{ fontSize: '0.8rem' }} />
                  )}
                </div>
              );
            })}
          </div>

          {lastOrder && (
            <div className="alert alert-success" style={{ marginTop: '1rem' }}>
              ✓ Created <strong>{lastOrder.orderNo}</strong> · KOT: {lastOrder.kotNo} · ₹{lastOrder.total} → Sent to Kitchen
            </div>
          )}

          <div style={{ position: 'sticky', bottom: 0, background: '#fafaf9', padding: '0.75rem 0', marginTop: '1rem' }}>
            <button type="submit" className="primary lg w-full" disabled={isLoading}>
              {isLoading ? 'Sending to Kitchen…' : '🍳 Send to Kitchen'}
            </button>
          </div>
        </form>
      )}

      {/* ACTIVE ORDERS */}
      {activeTab === 'active' && (
        <div>
          {ordersQuery.isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner"></span></div>}
          {orders.length === 0 && !ordersQuery.isLoading && <div className="empty-state"><div className="icon">📋</div><p>No active orders</p></div>}
          <div className="order-grid">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <span className={`badge source-${order.source}`}>{SOURCE_LABELS[order.source]}</span>
                  <span className={`badge status-${order.status}`}>{order.status}</span>
                </div>
                <div style={{ fontWeight: 700 }}>{order.orderNo}</div>
                {order.tableNumber && <span className="badge badge-blue">Table {order.tableNumber}</span>}
                {order.customerName && <div style={{ fontSize: '0.85rem' }}>{order.customerName}</div>}
                <ul className="order-items">
                  {order.items.map((item, i) => <li key={i}><span>{item.qty}× {item.nameSnapshot}</span><span>₹{item.priceSnapshot * item.qty}</span></li>)}
                </ul>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', borderTop: '1px solid #f5f5f4', paddingTop: '0.4rem' }}>
                  Total: ₹{order.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOVE TABLE */}
      {activeTab === 'move' && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <h2>Move Table</h2>
          <div className="form-grid">
            <label>Order to Move
              <select value={moveForm.id} onChange={(e) => setMoveForm({ ...moveForm, id: e.target.value })}>
                <option value="">Select order…</option>
                {orders.filter((o) => o.tableNumber).map((o) => (
                  <option key={o._id} value={o._id}>{o.orderNo} — Table {o.tableNumber}</option>
                ))}
              </select>
            </label>
            <label>Move to Table Number
              <input type="number" value={moveForm.toTableNumber} min="1"
                onChange={(e) => setMoveForm({ ...moveForm, toTableNumber: e.target.value })} />
            </label>
          </div>
          <button className="primary" style={{ marginTop: '0.75rem' }} disabled={!moveForm.id || !moveForm.toTableNumber}
            onClick={() => act(() => moveTable({ id: moveForm.id, toTableNumber: Number(moveForm.toTableNumber) }).unwrap(), 'Table moved').then(() => setMoveForm({ id: '', toTableNumber: '' }))}>
            Move Table
          </button>
        </div>
      )}

      {/* MERGE ORDERS */}
      {activeTab === 'merge' && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <h2>Merge Orders</h2>
          <p style={{ fontSize: '0.85rem', color: '#78716c' }}>Source order items will be moved into the target order.</p>
          <div className="form-grid">
            <label>Source Order (will be merged)
              <select value={mergeForm.id} onChange={(e) => setMergeForm({ ...mergeForm, id: e.target.value })}>
                <option value="">Select source…</option>
                {orders.map((o) => <option key={o._id} value={o._id}>{o.orderNo}{o.tableNumber ? ` (T${o.tableNumber})` : ''}</option>)}
              </select>
            </label>
            <label>Target Order (keep this)
              <select value={mergeForm.targetOrderId} onChange={(e) => setMergeForm({ ...mergeForm, targetOrderId: e.target.value })}>
                <option value="">Select target…</option>
                {orders.filter((o) => o._id !== mergeForm.id).map((o) => <option key={o._id} value={o._id}>{o.orderNo}{o.tableNumber ? ` (T${o.tableNumber})` : ''}</option>)}
              </select>
            </label>
          </div>
          <button className="primary" style={{ marginTop: '0.75rem' }} disabled={!mergeForm.id || !mergeForm.targetOrderId}
            onClick={() => act(() => mergeOrders(mergeForm).unwrap(), 'Orders merged').then(() => setMergeForm({ id: '', targetOrderId: '' }))}>
            Merge Orders
          </button>
        </div>
      )}

      {/* CANCEL ORDER */}
      {activeTab === 'cancel' && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <h2>Cancel Order</h2>
          <div className="form-grid">
            <label>Order to Cancel
              <select value={cancelForm.id} onChange={(e) => setCancelForm({ ...cancelForm, id: e.target.value })}>
                <option value="">Select order…</option>
                {orders.map((o) => <option key={o._id} value={o._id}>{o.orderNo} — ₹{o.total}</option>)}
              </select>
            </label>
            <label>Reason
              <select value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}>
                <option value="">Select reason…</option>
                {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <button className="danger" style={{ marginTop: '0.75rem' }} disabled={!cancelForm.id || !cancelForm.reason}
            onClick={() => act(() => cancelOrder({ id: cancelForm.id, reason: cancelForm.reason }).unwrap(), 'Order cancelled').then(() => setCancelForm({ id: '', reason: '' }))}>
            Cancel Order
          </button>
        </div>
      )}
    </section>
  );
};

export default StaffOrdersPage;
