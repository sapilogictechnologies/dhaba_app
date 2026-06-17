import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetMenuQuery } from '../api/menuApi.js';
import { useGetSettingsQuery } from '../api/settingsApi.js';
import { useValidateTableQrQuery } from '../api/tableApi.js';
import { useCreateCustomerOrderMutation, useCallWaiterMutation } from '../api/orderApi.js';
import { getCustomer, setCustomer, clearCustomer, getOrCreateCustomerKey, getCustomerToken } from '../utils/customerAuth.js';
import CustomerBottomNav from '../components/CustomerBottomNav.jsx';

/* ── Category color map for accent strips ── */
const CAT_COLORS = {
  'Roti': '#fef3c7', 'Bread': '#fef3c7', 'Sabzi': '#dcfce7', 'Curry': '#dcfce7',
  'Rice': '#e0e7ff', 'Biryani': '#e0e7ff', 'Dal': '#ffedd5', 'Soup': '#ffedd5',
  'Snacks': '#f3e8ff', 'Thali': '#cffafe', 'Drinks': '#fce7f3', 'Desserts': '#fef9c3',
  'default': '#f1f5f9',
};
const getCatColor = (cat = '') => {
  const key = Object.keys(CAT_COLORS).find(k => cat.toLowerCase().includes(k.toLowerCase()));
  return key ? CAT_COLORS[key] : CAT_COLORS.default;
};

/* ── Veg/Non-veg dot ──────────────────────────── */
const VegDot = ({ isVeg }) => isVeg === undefined ? null : (
  <span className={`veg-dot ${isVeg ? 'veg' : 'non-veg'}`} title={isVeg ? 'Veg' : 'Non-veg'} />
);

/* ── Food card (horizontal with image strip) ──── */
const FoodCard = ({ item, count, onAdd, onRemove, note, onNoteChange }) => {
  const accentBg = getCatColor(item.category);
  return (
    <div className={`food-card ${count > 0 ? 'in-cart' : ''}`} style={{ overflow: 'hidden', padding: 0 }}>
      {/* Image / accent strip */}
      <div style={{
        width: 72, flexShrink: 0, alignSelf: 'stretch',
        background: item.imageUrl ? 'transparent' : accentBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', minHeight: 80,
      }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <span style={{ fontSize: '1.75rem', opacity: 0.7 }}>🍛</span>
        )}
        {item.isVeg !== undefined && (
          <span style={{
            position: 'absolute', top: 4, left: 4,
            width: 14, height: 14, borderRadius: 3,
            border: `2px solid ${item.isVeg ? '#16a34a' : '#dc2626'}`,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              width: item.isVeg ? 7 : 0, height: item.isVeg ? 7 : 0,
              borderRadius: item.isVeg ? '50%' : 0,
              background: item.isVeg ? '#16a34a' : 'transparent',
              borderLeft: item.isVeg ? 'none' : '3.5px solid transparent',
              borderRight: item.isVeg ? 'none' : '3.5px solid transparent',
              borderBottom: item.isVeg ? 'none' : '6.5px solid #dc2626',
              display: 'block',
            }} />
          </span>
        )}
        {item.stockStatus === 'OUT_OF_STOCK' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 800, textAlign: 'center', padding: '0 4px' }}>OUT OF STOCK</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="food-card-info" style={{ padding: '0.75rem 0.6rem 0.75rem 0.85rem' }}>
        <div className="food-card-name">
          {item.name}
        </div>
        {item.description && (
          <div className="food-card-desc">{item.description}</div>
        )}
        <div className="food-card-meta">
          <span className="food-card-price">₹{item.price}</span>
          {item.prepTimeMinutes > 0 && (
            <span className="food-card-time">⏱ {item.prepTimeMinutes}m</span>
          )}
          {item.category && (
            <span style={{ fontSize: '0.65rem', background: accentBg, color: '#374151', borderRadius: 4, padding: '0.1rem 0.35rem', fontWeight: 600 }}>
              {item.category}
            </span>
          )}
        </div>
        {count > 0 && (
          <input
            className="food-card-note"
            placeholder="Add note…"
            value={note || ''}
            onChange={(e) => onNoteChange(item._id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Action */}
      <div className="food-card-right" style={{ padding: '0.75rem 0.85rem 0.75rem 0', flexShrink: 0 }}>
        {count === 0 ? (
          <button className="food-add-btn" onClick={() => onAdd(item._id)} type="button"
            disabled={item.stockStatus === 'OUT_OF_STOCK'}
            style={item.stockStatus === 'OUT_OF_STOCK' ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
            +
          </button>
        ) : (
          <div className="qty-stepper">
            <button type="button" onClick={() => onRemove(item._id)}
              style={{ background: '#fef3c7', borderColor: '#d97706', color: '#92400e' }}>−</button>
            <span style={{ color: '#d97706', fontWeight: 800 }}>{count}</span>
            <button type="button" onClick={() => onAdd(item._id)}
              style={{ background: '#d97706', borderColor: '#d97706', color: '#fff' }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Skeleton loader ──────────────────────────── */
const FoodSkeleton = () => (
  <div className="food-card" style={{ opacity: 0.5 }}>
    <div className="food-card-info">
      <div style={{ height: '0.9rem', background: '#e2e8f0', borderRadius: 4, width: '60%', marginBottom: '0.4rem' }} />
      <div style={{ height: '0.72rem', background: '#e2e8f0', borderRadius: 4, width: '85%', marginBottom: '0.4rem' }} />
      <div style={{ height: '0.85rem', background: '#e2e8f0', borderRadius: 4, width: '30%' }} />
    </div>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e2e8f0', flexShrink: 0 }} />
  </div>
);

/* ── Success screen ───────────────────────────── */
const SuccessScreen = ({ order, mode, token, onReset }) => {
  const navigate = useNavigate();
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [callWaiter, waiterState] = useCallWaiterMutation();

  const eta = order.delivery?.etaMinutesCalculated;
  const allItems = order.kotItemsSnapshot?.length ? order.kotItemsSnapshot : order.items;

  const handleCallWaiter = async () => {
    try { await callWaiter({ id: order._id, token }).unwrap(); setWaiterCalled(true); setTimeout(() => setWaiterCalled(false), 15000); }
    catch { /* ignore */ }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', paddingBottom: '2rem' }}>
      <div style={{ background: 'var(--navy)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '2px solid var(--gold)' }}>
        <span style={{ fontSize: '1.35rem' }}>🍛</span>
        <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '0.95rem' }}>Order Placed</span>
      </div>

      <div className="public-page" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--white)', borderRadius: 20, marginBottom: '1rem', border: '1px solid #bbf7d0', boxShadow: '0 2px 12px rgba(16,185,129,0.1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
            {mode === 'DELIVERY' ? '🚴' : mode === 'QR_TABLE' ? '🪑' : '🛍'}
          </div>
          <h1 style={{ color: '#16a34a', margin: '0 0 0.25rem', fontSize: '1.5rem' }}>
            {mode === 'DELIVERY' ? 'Order Placed!' : mode === 'QR_TABLE' ? 'Order Sent to Kitchen!' : 'Order Placed!'}
          </h1>
          <p style={{ color: '#78716c', margin: '0 0 1rem', fontSize: '0.875rem' }}>
            {mode === 'DELIVERY' ? 'We\'ll start preparing once payment is verified' :
             mode === 'QR_TABLE' ? 'Your food will come to the table' :
             'Come to the counter when your order is ready'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
            <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '0.25rem 0.75rem', fontWeight: 700 }}>{order.orderNo}</span>
            {order.kotNo && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '0.25rem 0.75rem', fontWeight: 700 }}>{order.kotNo}</span>}
            <span className={`badge status-${order.status}`}>{order.status.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* ETA */}
        {eta > 0 && (
          <div className="alert alert-info" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            ⏱ Estimated time: <strong>{eta} minutes</strong>
          </div>
        )}

        {/* Payment info */}
        {mode === 'DELIVERY' && (
          <div className="alert alert-warn" style={{ marginBottom: '1rem' }}>
            ⏳ <strong>Payment under review</strong> — We'll confirm your UPI payment and send the order to kitchen shortly.
          </div>
        )}
        {mode === 'PICKUP' && (
          <div className="alert alert-navy" style={{ marginBottom: '1rem' }}>
            💳 Pay <strong>₹{order.total}</strong> at the counter when you collect your order.
          </div>
        )}

        {/* Order summary */}
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.65rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#78716c' }}>Order Summary</h3>
          <ul className="order-items">
            {allItems.map((item, i) => {
              const price = item.priceSnapshot ?? order.items.find((x) => String(x.itemId) === String(item.itemId))?.priceSnapshot ?? 0;
              return (
                <li key={i} style={{ padding: '0.4rem 0' }}>
                  <span style={{ fontWeight: 600 }}>{item.qty}× {item.nameSnapshot}</span>
                  {item.itemNotes && <div style={{ fontSize: '0.72rem', color: '#78716c', fontStyle: 'italic' }}>{item.itemNotes}</div>}
                  {price > 0 && <span style={{ color: '#78716c' }}>₹{price * item.qty}</span>}
                </li>
              );
            })}
          </ul>
          <div style={{ borderTop: '1px solid #e7e5e4', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            {order.deliveryCharge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}><span>Delivery</span><span>₹{order.deliveryCharge}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#d97706', marginTop: '0.2rem' }}>
              <span>Total</span><span>₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {mode === 'QR_TABLE' && (
            <button className={`w-full lg ${waiterCalled ? 'success' : ''}`} style={{ borderRadius: 12 }}
              onClick={handleCallWaiter} disabled={waiterState.isLoading || waiterCalled}>
              {waiterCalled ? '✓ Waiter on the way!' : '🔔 Call Waiter'}
            </button>
          )}
          <button className="primary w-full lg" style={{ borderRadius: 12 }}
            onClick={() => navigate(`/order-status/${order.orderNo}`)}>
            📍 Track My Order Live
          </button>
          <button className="w-full" style={{ borderRadius: 12 }} onClick={onReset}>
            + Place Another Order
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ────────────────────────────────── */
const CustomerOrderPage = () => {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || searchParams.get('tableNumber') || '';
  const qrToken     = searchParams.get('token') || '';
  const typeParam   = searchParams.get('type') || '';

  // Customer auth state
  const { token: custReduxToken, user: custUser } = useSelector((s) => s.customerAuth);
  const isCustomerLoggedIn = !!(custReduxToken || getCustomerToken());

  const menuQuery     = useGetMenuQuery({ availableOnly: true });
  const settingsQuery = useGetSettingsQuery();
  const validateQuery = useValidateTableQrQuery(
    { tableNumber, token: qrToken },
    { skip: !tableNumber || !qrToken }
  );
  const [createCustomerOrder, createState] = useCreateCustomerOrderMutation();

  const [mode, setMode]                 = useState(tableNumber ? 'QR_TABLE' : typeParam === 'delivery' ? 'DELIVERY' : 'PICKUP');
  const [qty, setQty]                   = useState({});
  const [itemNotes, setItemNotes]       = useState({});
  const [activeCategory, setActiveCat] = useState('');
  const [search, setSearch]             = useState('');
  const [showCart, setShowCart]         = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [formError, setFormError]       = useState('');
  const [submitted, setSubmitted]       = useState(null);

  const savedCustomer = useMemo(() => getCustomer(), []);
  // Auto-fill from logged-in account user, fall back to localStorage identity
  const prefillName  = custUser?.name  || savedCustomer?.name  || '';
  const prefillPhone = custUser?.phone || savedCustomer?.phone || '';

  const [form, setForm] = useState({
    customerName:  prefillName,
    customerPhone: prefillPhone,
    addressText:   '',
    landmark:      '',
    distanceKm:    '',
    utr:           '',
    proof:         null,
    orderNotes:    ''
  });

  const fileRef     = useRef(null);
  const checkoutRef = useRef(null);
  const customerKey = useMemo(() => getOrCreateCustomerKey(), []);

  const menu       = menuQuery.data?.data?.menu  || [];
  const settings   = settingsQuery.data?.data?.settings || {};
  const categories = useMemo(() => [...new Set(menu.map((i) => i.category).filter(Boolean))], [menu]);
  const filtered   = useMemo(() => {
    let list = activeCategory ? menu.filter(i => i.category === activeCategory) : menu;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
    }
    return list;
  }, [menu, activeCategory, search]);

  const maxKm  = settings.maxDeliveryDistanceKm ?? 3;
  const perKm  = settings.deliveryChargePerKm   ?? 20;
  const parsedKm = parseFloat(form.distanceKm)  || 0;
  const kmOk   = parsedKm > 0 && parsedKm <= maxKm;

  const deliveryCharge = mode === 'DELIVERY' && kmOk ? Math.ceil(parsedKm * perKm) : 0;

  const cartItems = useMemo(() =>
    Object.entries(qty)
      .filter(([, q]) => Number(q) > 0)
      .map(([itemId, q]) => {
        const item = menu.find((m) => m._id === itemId);
        return item ? { itemId, qty: Number(q), name: item.name, price: item.price } : null;
      })
      .filter(Boolean),
    [qty, menu]
  );

  const subtotal   = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const total      = subtotal + deliveryCharge;
  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0);

  const adjustQty = (itemId, delta) => setQty((prev) => {
    const next = Math.max(0, (Number(prev[itemId]) || 0) + delta);
    const updated = { ...prev, [itemId]: next };
    if (next === 0) delete updated[itemId];
    return updated;
  });

  const handleNoteChange = (itemId, val) =>
    setItemNotes((prev) => ({ ...prev, [itemId]: val }));

  const scrollCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
    setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (cartItems.length === 0)              return setFormError('Please add at least one item.');
    if (!form.customerName.trim())           return setFormError('Please enter your name.');
    if (!form.customerPhone.trim() || form.customerPhone.trim().length < 6)
                                             return setFormError('Please enter a valid phone number.');
    if (mode === 'DELIVERY' && !form.addressText.trim()) return setFormError('Please enter your delivery address.');
    if (mode === 'DELIVERY' && !parsedKm)    return setFormError('Please enter your distance from the restaurant.');
    if (mode === 'DELIVERY' && parsedKm > maxKm)
                                             return setFormError(`Delivery only within ${maxKm} km.`);

    // Save customer identity for future visits
    setCustomer({ name: form.customerName, phone: form.customerPhone });

    const fd = new FormData();
    fd.append('customerKey', customerKey);
    fd.append('customerName', form.customerName.trim());
    fd.append('customerPhone', form.customerPhone.trim());
    fd.append('notes', form.orderNotes.trim());
    fd.append('items', JSON.stringify(
      cartItems.map((i) => ({ itemId: i.itemId, qty: i.qty, itemNotes: itemNotes[i.itemId] || '' }))
    ));

    if (mode === 'QR_TABLE') {
      fd.append('tableNumber', tableNumber);
      fd.append('token', qrToken);
      fd.append('delivery', JSON.stringify({ type: 'TABLE', distanceBucket: 'NA' }));
    } else if (mode === 'DELIVERY') {
      fd.append('delivery', JSON.stringify({ type: 'DELIVERY', distanceKm: parsedKm, addressText: form.addressText.trim(), landmark: form.landmark.trim() }));
      fd.append('payment', JSON.stringify({ method: 'UPI', utr: form.utr.trim() }));
      if (form.proof) fd.append('proof', form.proof);
    } else {
      fd.append('delivery', JSON.stringify({ type: 'PICKUP', distanceBucket: 'NA' }));
    }

    try {
      const res = await createCustomerOrder(fd).unwrap();
      setSubmitted(res.data.order);
      setQty({}); setItemNotes({});
    } catch (err) {
      setFormError(err?.data?.message || 'Failed to place order. Please try again.');
    }
  };

  if (submitted) {
    return <SuccessScreen order={submitted} mode={mode} token={qrToken} onReset={() => { setSubmitted(null); setShowCheckout(false); }} />;
  }

  return (
    <>
      {/* ── Sticky customer header ── */}
      <div className="cust-header no-print">
        <Link to="/" className="cust-header-brand">
          <span style={{ fontSize: '1.3rem' }}>🍛</span>
          <span>{settings.dhabaName || 'Dhaba'}</span>
        </Link>
        <div className="cust-header-actions">
          {(custUser || savedCustomer) && (
            <span className="cust-profile-chip" title="Logged in as">
              👤 {(custUser?.name || savedCustomer?.name || '').split(' ')[0]}
            </span>
          )}
          {isCustomerLoggedIn ? (
            <Link to="/customer/account">
              <button className="cust-header-btn">👤 Account</button>
            </Link>
          ) : (
            <>
              <Link to="/customer/login">
                <button className="cust-header-btn">Sign In</button>
              </Link>
              <Link to="/my-orders">
                <button className="cust-header-btn">📋 Orders</button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="public-page">
        {/* ── Announcement ── */}
        {settings.announcementText && (
          <div className="alert alert-warn" style={{ margin: '0.5rem 0' }}>
            📢 {settings.announcementText}
          </div>
        )}

        {/* ── QR table banner ── */}
        {tableNumber && (
          <div className={`alert ${validateQuery.isSuccess ? 'alert-success' : validateQuery.isError ? 'alert-error' : 'alert-info'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {validateQuery.isLoading && <span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }}></span>}
            {validateQuery.isSuccess ? '✓ Table ' + tableNumber + ' — Scan verified, order direct from your seat!' :
             validateQuery.isLoading ? 'Verifying your table QR code…' : '⚠ QR code invalid or expired'}
          </div>
        )}

        {/* ── Order mode selector ── */}
        {!tableNumber && (
          <>
            <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c', margin: '0 0 0.5rem' }}>
                How would you like to order?
              </p>
              <div className="order-mode-grid">
                <div className={`order-mode-card ${mode === 'PICKUP' ? 'active' : ''}`}
                  onClick={() => setMode('PICKUP')} role="button" tabIndex={0}>
                  <span className="order-mode-icon">🛍</span>
                  <div>
                    <div className="order-mode-label">Pickup from Counter</div>
                    <div className="order-mode-sub">Collect when ready · Pay at counter</div>
                  </div>
                </div>
                {settings.deliveryEnabled !== false && (
                  <div className={`order-mode-card ${mode === 'DELIVERY' ? 'active' : ''}`}
                    onClick={() => setMode('DELIVERY')} role="button" tabIndex={0}>
                    <span className="order-mode-icon">🚴</span>
                    <div>
                      <div className="order-mode-label">Home Delivery</div>
                      <div className="order-mode-sub">₹{perKm}/km · Max {maxKm}km · Pay via UPI</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {mode === 'DELIVERY' && parsedKm > maxKm && (
              <div className="alert alert-error" style={{ margin: '0.5rem 0' }}>
                ❌ Delivery not available beyond {maxKm} km from our restaurant.
              </div>
            )}
            {mode === 'DELIVERY' && kmOk && (
              <div className="alert alert-success" style={{ margin: '0.5rem 0' }}>
                ✓ Delivery available · Charge: <strong>₹{Math.ceil(parsedKm * perKm)}</strong>
              </div>
            )}
          </>
        )}

        {/* ── Search bar ── */}
        {menu.length > 0 && (
          <div style={{ position: 'relative', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', color: '#94a3b8' }}>🔍</span>
            <input
              type="search"
              placeholder="Search dishes…"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCat(''); }}
              style={{ paddingLeft: '2.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.875rem' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8', padding: 0 }}>
                ✕
              </button>
            )}
          </div>
        )}

        {/* ── Category chips ── */}
        {menu.length > 0 && (
          <div className="cat-bar">
            <button type="button" className={`cat-chip ${!activeCategory ? 'active' : ''}`} onClick={() => { setActiveCat(''); setSearch(''); }}>
              All
            </button>
            {categories.map((cat) => (
              <button type="button" key={cat} className={`cat-chip ${activeCategory === cat ? 'active' : ''}`} onClick={() => { setActiveCat(cat); setSearch(''); }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {menuQuery.isLoading && (
          <div className="food-list" style={{ marginTop: '0.5rem' }}>
            {[1,2,3,4,5,6].map((n) => <FoodSkeleton key={n} />)}
          </div>
        )}

        {/* ── Menu food list ── */}
        {!menuQuery.isLoading && (
          <div className="food-list" style={{ marginTop: '0.5rem' }}>
            {filtered.map((item) => (
              <FoodCard
                key={item._id}
                item={item}
                count={Number(qty[item._id]) || 0}
                note={itemNotes[item._id]}
                onAdd={(id) => adjustQty(id, 1)}
                onRemove={(id) => adjustQty(id, -1)}
                onNoteChange={handleNoteChange}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && !menuQuery.isLoading && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }}>
              {search ? '🔍' : '🍽'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1c1917', marginBottom: '0.35rem' }}>
              {search ? `No results for "${search}"` : menu.length === 0 ? 'Menu loading…' : 'Nothing here right now'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#78716c', marginBottom: '1.25rem' }}>
              {search
                ? 'Try a different name or browse by category.'
                : menu.length === 0
                  ? 'Our menu will appear here shortly. Please check back.'
                  : 'Try a different category or check back later.'}
            </div>
            {search ? (
              <button type="button" onClick={() => setSearch('')}
                style={{ background: '#1e3a5f', border: 'none', color: '#fff', borderRadius: 10, padding: '0.65rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                Clear Search
              </button>
            ) : (
              activeCategory && (
                <button type="button" onClick={() => setActiveCat('')}
                  style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '0.65rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                  View All Items
                </button>
              )
            )}
          </div>
        )}

        {/* ── Cart panel (expanded) ── */}
        {showCart && cartItems.length > 0 && (
          <div className="panel" style={{ marginTop: '1rem', border: '2px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>🛒 Your Cart</h3>
              <button className="sm" onClick={() => setShowCart(false)}>✕ Close</button>
            </div>
            {cartItems.map((i) => (
              <div key={i.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f5f5f4', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{i.qty}× {i.name}</span>
                  {itemNotes[i.itemId] && <div style={{ fontSize: '0.72rem', color: '#78716c', fontStyle: 'italic' }}>{itemNotes[i.itemId]}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: '#78716c', minWidth: '3rem', textAlign: 'right' }}>₹{i.price * i.qty}</span>
                  <div className="qty-stepper">
                    <button type="button" style={{ width: 28, height: 28, fontSize: '0.9rem' }} onClick={() => adjustQty(i.itemId, -1)}>−</button>
                    <span style={{ fontSize: '0.875rem', minWidth: '1.25rem' }}>{i.qty}</span>
                    <button type="button" style={{ width: 28, height: 28, fontSize: '0.9rem', background: '#d97706', borderColor: '#d97706', color: '#fff' }} onClick={() => adjustQty(i.itemId, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{subtotal}</span></div>
              {deliveryCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}><span>Delivery charge</span><span>₹{deliveryCharge}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#d97706', borderTop: '1px solid #e7e5e4', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
                <span>Total</span><span>₹{total}</span>
              </div>
            </div>
            <button className="primary w-full lg" style={{ marginTop: '1rem', borderRadius: 10 }} onClick={scrollCheckout}>
              Proceed to Checkout →
            </button>
          </div>
        )}

        {/* ── Checkout form ── */}
        {cartItems.length > 0 && showCheckout && (
          <form className="panel" onSubmit={submit} style={{ marginTop: '1rem' }} ref={checkoutRef}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e7e5e4' }}>
              👤 Your Details
            </h3>

            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <label>Your Name *
                <input value={form.customerName} onChange={(e) => { setForm({ ...form, customerName: e.target.value }); setFormError(''); }} placeholder="Full name" autoComplete="name" required />
              </label>
              <label>Phone Number *
                <input type="tel" value={form.customerPhone} onChange={(e) => { setForm({ ...form, customerPhone: e.target.value }); setFormError(''); }} placeholder="10-digit mobile number" autoComplete="tel" required />
              </label>
            </div>

            {savedCustomer && (
              <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#78716c' }}>
                <span>✓ Pre-filled from your last visit</span>
                <button type="button" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => { clearCustomer(); setForm((f) => ({ ...f, customerName: '', customerPhone: '' })); }}>
                  Clear
                </button>
              </div>
            )}

            {/* ── Delivery details ── */}
            {mode === 'DELIVERY' && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e7e5e4' }}>
                  🚴 Delivery Details
                </h3>

                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <label>
                    Distance from restaurant (km) *
                    <input type="number" value={form.distanceKm} min="0.1" max={maxKm} step="0.1"
                      placeholder={`e.g. 1.5 (max ${maxKm} km)`}
                      onChange={(e) => { setForm({ ...form, distanceKm: e.target.value }); setFormError(''); }}
                      style={{ border: parsedKm > maxKm ? '2px solid #dc2626' : undefined }} />
                    {parsedKm > 0 && parsedKm <= maxKm && (
                      <span style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.2rem', display: 'block' }}>
                        ✓ Delivery charge: ₹{Math.ceil(parsedKm * perKm)}
                      </span>
                    )}
                    {parsedKm > maxKm && (
                      <span style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.2rem', display: 'block' }}>
                        ✗ Delivery not available beyond {maxKm} km
                      </span>
                    )}
                  </label>
                  <label>Delivery Address *
                    <input value={form.addressText} onChange={(e) => { setForm({ ...form, addressText: e.target.value }); setFormError(''); }} placeholder="House no., street, area" required />
                  </label>
                  <label>Landmark (optional)
                    <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Near school, hospital, etc." />
                  </label>
                </div>

                {/* UPI payment */}
                {settings.upiId && (
                  <div className="upi-box">
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                      💳 Pay via UPI before ordering
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#1e40af', marginBottom: '0.35rem' }}>Send payment to:</div>
                    <div className="upi-id-display">{settings.upiId}</div>
                    {total > 0 && <div className="upi-amount">₹{total}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', textAlign: 'center', marginTop: '0.35rem' }}>
                      After paying, enter the UTR number below
                    </div>
                  </div>
                )}

                <div className="form-grid">
                  <label>UPI UTR / Transaction ID
                    <input value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} placeholder="12-digit UTR number" />
                  </label>
                  <label>Payment Screenshot (optional)
                    <input type="file" ref={fileRef} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setForm({ ...form, proof: e.target.files[0] })} />
                  </label>
                </div>
              </div>
            )}

            {/* ── Pickup info ── */}
            {mode === 'PICKUP' && (
              <div className="alert alert-navy" style={{ marginBottom: '1rem' }}>
                🛍 <strong>Pickup order</strong> — pay <strong>₹{total}</strong> at the counter when you collect.
                {settings.phone && <> · 📞 {settings.phone}</>}
              </div>
            )}

            {/* ── Special instructions ── */}
            <label style={{ marginBottom: '1rem' }}>
              Special Instructions (optional)
              <input value={form.orderNotes} onChange={(e) => setForm({ ...form, orderNotes: e.target.value })} placeholder="Spice level, allergies, special requests…" />
            </label>

            {/* ── Summary ── */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {cartItems.map((i) => (
                <div key={i.itemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#44403c' }}>
                  <span>{i.qty}× {i.name}</span><span>₹{i.price * i.qty}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                {deliveryCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}>
                    <span>Delivery charge</span><span>₹{deliveryCharge}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#d97706', marginTop: '0.25rem' }}>
                  <span>Total</span><span>₹{total}</span>
                </div>
              </div>
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>⚠ {formError}</div>
            )}
            {createState.error && !formError && (
              <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
                {createState.error?.data?.message || 'Failed to place order. Please try again.'}
              </div>
            )}

            <button type="submit" className="primary w-full lg" style={{ borderRadius: 12, fontSize: '1.05rem', fontWeight: 800 }}
              disabled={createState.isLoading || cartItems.length === 0}>
              {createState.isLoading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}></span>
                    Placing order…
                  </span>
                : `✓ Place Order · ₹${total}`}
            </button>
          </form>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', padding: '1rem 0', borderTop: '1px solid #e7e5e4', fontSize: '0.82rem', color: '#78716c', display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link to="/my-orders" style={{ color: '#d97706', fontWeight: 600 }}>📋 My Orders</Link>
          <Link to="/" style={{ color: '#78716c' }}>← Home</Link>
        </div>
      </div>

      {/* ── Customer mobile bottom nav ── */}
      <CustomerBottomNav
        cartCount={totalItems}
        onCartClick={() => { setShowCart(true); setShowCheckout(false); }}
      />

      {/* ── Sticky cart bar ── */}
      {cartItems.length > 0 && (
        <div className="cart-bar no-print">
          <div className="cart-bar-inner">
            <div>
              <div className="cart-item-count">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
                <span className="cart-bar-count">{totalItems}</span>
              </div>
              <div className="cart-subtotal">
                {mode === 'DELIVERY' && deliveryCharge > 0 ? `₹${subtotal} + ₹${deliveryCharge} delivery` : `₹${subtotal}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!showCart && (
                <button className="sm" onClick={() => setShowCart(true)} style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', background: 'transparent' }}>
                  View Cart
                </button>
              )}
              <button className="gold" style={{ fontWeight: 800, borderRadius: 8, padding: '0.55rem 1.1rem' }} onClick={scrollCheckout}>
                ₹{total} · Checkout →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerOrderPage;
