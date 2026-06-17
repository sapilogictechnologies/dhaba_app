import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState, useRef } from 'react';
import { useGetSettingsQuery } from '../api/settingsApi.js';
import { useGetMenuQuery } from '../api/menuApi.js';
import { getCustomer, getCustomerToken } from '../utils/customerAuth.js';

/* ── Animated counter ── */
const Counter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(start);
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString('en-IN')}{suffix}</span>;
};

/* ── Category card ── */
const CATEGORIES = [
  { icon: '🫓', label: 'Roti & Bread', color: '#fef3c7', border: '#fde68a', text: '#92400e' },
  { icon: '🥘', label: 'Sabzi & Curry', color: '#dcfce7', border: '#86efac', text: '#15803d' },
  { icon: '🍚', label: 'Rice & Biryani', color: '#e0e7ff', border: '#a5b4fc', text: '#4338ca' },
  { icon: '🫕', label: 'Dal & Soup', color: '#ffedd5', border: '#fdba74', text: '#c2410c' },
  { icon: '🥗', label: 'Snacks', color: '#f3e8ff', border: '#d8b4fe', text: '#7c3aed' },
  { icon: '🍱', label: 'Thali', color: '#cffafe', border: '#67e8f9', text: '#0e7490' },
  { icon: '🧃', label: 'Drinks', color: '#fce7f3', border: '#f9a8d4', text: '#be185d' },
  { icon: '🍮', label: 'Desserts', color: '#fef9c3', border: '#fde047', text: '#854d0e' },
];

/* ── Menu dish card ── */
const DishCard = ({ item, onOrder }) => (
  <div className="lp-dish-card">
    <div className="lp-dish-img">
      {item.imageUrl
        ? <img src={item.imageUrl} alt={item.name} loading="lazy" />
        : <div className="lp-dish-placeholder">🍛</div>}
      {item.isVeg !== undefined && (
        <span className={`lp-dish-badge ${item.isVeg ? 'veg' : 'nonveg'}`}>
          {item.isVeg ? '🟢 Veg' : '🔴 Non-veg'}
        </span>
      )}
    </div>
    <div className="lp-dish-body">
      <div className="lp-dish-name">{item.name}</div>
      {item.description && <div className="lp-dish-desc">{item.description}</div>}
      <div className="lp-dish-footer">
        <span className="lp-dish-price">₹{item.price}</span>
        {item.prepTimeMinutes > 0 && <span className="lp-dish-time">⏱ {item.prepTimeMinutes}m</span>}
        <button className="lp-dish-add" onClick={onOrder} type="button">+ Add</button>
      </div>
    </div>
  </div>
);

const LandingPage = () => {
  const { token, user } = useSelector((state) => state.auth);
  const { token: custToken } = useSelector((state) => state.customerAuth);
  const navigate = useNavigate();
  const { data: settingsData } = useGetSettingsQuery();
  const { data: menuData } = useGetMenuQuery({ availableOnly: true });
  const settings = settingsData?.data?.settings || {};
  const dhabaName = settings.dhabaName || 'Dhaba';
  const customer = getCustomer();
  const isCustomerLoggedIn = !!(custToken || getCustomerToken());
  const myOrdersPath = isCustomerLoggedIn ? '/customer/account' : '/my-orders';
  const isOpen = settings.businessOpen !== false;

  const menu = menuData?.data?.menu || [];
  const popular = menu.slice(0, 6);

  useEffect(() => {
    if (token && user) navigate('/dashboard', { replace: true });
  }, [token, user, navigate]);

  return (
    <div className="lp-root">

      {/* ── Fixed Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <span className="lp-nav-logo">🍛</span>
          <span>{dhabaName}</span>
        </div>
        <div className="lp-nav-links">
          {customer && (
            <span className="lp-nav-user">👤 {customer.name.split(' ')[0]}</span>
          )}
          <Link to={myOrdersPath}>
            <button className="lp-nav-btn outline">
              {isCustomerLoggedIn ? '👤 Account' : 'My Orders'}
            </button>
          </Link>
          <Link to="/order">
            <button className="lp-nav-btn gold">🛍 Order Now</button>
          </Link>
          <Link to="/login">
            <button className="lp-nav-btn ghost">Staff</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          {/* Status badge */}
          <div className={`lp-status-pill ${isOpen ? 'open' : 'closed'}`}>
            <span className={isOpen ? 'live-dot' : 'lp-closed-dot'} />
            {isOpen ? 'Accepting Orders · Open Now' : 'Currently Closed'}
          </div>

          <h1 className="lp-hero-h1">
            Ghar Jaisa Khana,<br />
            <span className="lp-hero-accent">Delivered Fresh 🌿</span>
          </h1>

          <p className="lp-hero-sub">
            Authentic dhaba flavours — pickup, delivery, or dine-in.
            Live order tracking included.
            {settings.address && (
              <><br /><span className="lp-hero-addr">📍 {settings.address}</span></>
            )}
          </p>

          {/* CTA buttons */}
          <div className="lp-cta-row">
            <Link to="/order" style={{ textDecoration: 'none' }}>
              <button className="lp-cta-primary">🛍 Order Food Now</button>
            </Link>
            <Link to={myOrdersPath} style={{ textDecoration: 'none' }}>
              <button className="lp-cta-secondary">
                {isCustomerLoggedIn ? '👤 My Account' : '📋 Track My Order'}
              </button>
            </Link>
          </div>

          {/* Trust chips */}
          <div className="lp-trust-row">
            {[
              { icon: '🚴', text: 'Home Delivery', show: settings.deliveryEnabled !== false },
              { icon: '🛍', text: 'Counter Pickup', show: true },
              { icon: '🪑', text: 'Dine-in', show: true },
              { icon: '📍', text: 'Live Tracking', show: true },
              { icon: '🌿', text: 'Fresh Daily', show: true },
            ].filter(i => i.show).map(i => (
              <span key={i.text} className="lp-trust-chip">
                {i.icon} {i.text}
              </span>
            ))}
          </div>
        </div>

        {/* Floating food emoji decoration */}
        <div className="lp-hero-decor" aria-hidden="true">
          <span style={{ top: '15%', left: '5%', animationDelay: '0s' }}>🍛</span>
          <span style={{ top: '25%', right: '8%', animationDelay: '0.6s' }}>🫓</span>
          <span style={{ top: '55%', left: '3%', animationDelay: '1.2s' }}>🥘</span>
          <span style={{ top: '65%', right: '5%', animationDelay: '0.3s' }}>🍚</span>
          <span style={{ top: '80%', left: '12%', animationDelay: '0.9s' }}>🥗</span>
          <span style={{ top: '75%', right: '12%', animationDelay: '1.5s' }}>🧃</span>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <section className="lp-stats-bar">
        <div className="lp-stats-inner">
          {[
            { icon: '🍽', label: 'Happy Customers', target: 1500, suffix: '+' },
            { icon: '⏱', label: 'Avg Prep Time', target: 15, suffix: ' min' },
            { icon: '🌿', label: 'Fresh Dishes Daily', target: 30, suffix: '+' },
            { icon: '⭐', label: 'Rating', target: 48, suffix: '/50' },
          ].map(s => (
            <div key={s.label} className="lp-stat-item">
              <div className="lp-stat-icon">{s.icon}</div>
              <div className="lp-stat-num"><Counter target={s.target} suffix={s.suffix} /></div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <h2>Browse by Category</h2>
            <p>What are you craving today?</p>
          </div>
          <div className="lp-cat-grid">
            {CATEGORIES.map(cat => (
              <Link key={cat.label} to={`/order`} style={{ textDecoration: 'none' }}>
                <div className="lp-cat-card" style={{ background: cat.color, borderColor: cat.border }}>
                  <span className="lp-cat-icon">{cat.icon}</span>
                  <span className="lp-cat-label" style={{ color: cat.text }}>{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Dishes ── */}
      {popular.length > 0 && (
        <section className="lp-section lp-section-alt">
          <div className="lp-section-inner">
            <div className="lp-section-head">
              <h2>🔥 Popular Dishes</h2>
              <p>Ordered most by our customers</p>
            </div>
            <div className="lp-dish-grid">
              {popular.map(item => (
                <DishCard
                  key={item._id}
                  item={item}
                  onOrder={() => navigate('/order')}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/order">
                <button className="lp-view-all-btn">View Full Menu →</button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Order Types ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <h2>Order Your Way</h2>
            <p>Multiple ways to enjoy our food</p>
          </div>
          <div className="lp-order-types">
            {[
              {
                icon: '🛍',
                title: 'Counter Pickup',
                desc: 'Order online, walk in & collect when ready. Pay at counter — no waiting in line.',
                badge: 'Fastest',
                badgeColor: '#15803d',
                bg: '#f0fdf4',
                border: '#86efac',
              },
              settings.deliveryEnabled !== false && {
                icon: '🚴',
                title: 'Home Delivery',
                desc: `We deliver within ${settings.maxDeliveryDistanceKm || 3} km. ₹${settings.deliveryChargePerKm || 20}/km. Pay via UPI securely.`,
                badge: 'Popular',
                badgeColor: '#1d4ed8',
                bg: '#eff6ff',
                border: '#93c5fd',
              },
              {
                icon: '🪑',
                title: 'Dine-in',
                desc: 'Walk in any time. Our staff will seat you and take your order fresh.',
                badge: 'Relaxed',
                badgeColor: '#7c3aed',
                bg: '#f5f3ff',
                border: '#c4b5fd',
              },
              {
                icon: '📲',
                title: 'QR Table Order',
                desc: 'Scan the QR code on your table and order directly — food comes to you.',
                badge: 'Instant',
                badgeColor: '#0e7490',
                bg: '#ecfeff',
                border: '#67e8f9',
              },
            ].filter(Boolean).map(t => (
              <Link key={t.title} to="/order" style={{ textDecoration: 'none' }}>
                <div className="lp-order-type-card" style={{ background: t.bg, borderColor: t.border }}>
                  <div className="lp-ot-top">
                    <span className="lp-ot-icon">{t.icon}</span>
                    <span className="lp-ot-badge" style={{ color: t.badgeColor, background: t.bg, borderColor: t.badgeColor }}>{t.badge}</span>
                  </div>
                  <div className="lp-ot-title">{t.title}</div>
                  <div className="lp-ot-desc">{t.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-section-dark">
        <div className="lp-section-inner">
          <div className="lp-section-head white">
            <h2>How It Works</h2>
            <p>Order fresh food in 3 simple steps</p>
          </div>
          <div className="lp-how-grid">
            {[
              { num: '1', icon: '🍽', title: 'Browse Menu', desc: 'Pick your favourite dishes from our fresh daily menu. Filter by category.' },
              { num: '2', icon: '🛍', title: 'Choose & Checkout', desc: 'Select pickup, delivery or dine-in. Fill your details. Done in under a minute.' },
              { num: '3', icon: '📍', title: 'Track Live', desc: 'Watch your order go from kitchen to your hands in real time.' },
            ].map((s, i) => (
              <div key={s.num} className="lp-how-card">
                <div className="lp-how-num">{s.num}</div>
                <div className="lp-how-icon">{s.icon}</div>
                {i < 2 && <div className="lp-how-arrow">→</div>}
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/order">
              <button className="lp-cta-primary" style={{ fontSize: '1rem' }}>
                Start Ordering →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <h2>Why {dhabaName}?</h2>
            <p>We take pride in every plate we serve</p>
          </div>
          <div className="lp-why-grid">
            {[
              { icon: '🌿', title: 'Fresh Every Day', desc: 'Ingredients sourced daily. No stale food, ever. Cooked fresh each morning.' },
              { icon: '⚡', title: 'Fast & Reliable', desc: 'Average prep time under 15 minutes. Real-time tracking keeps you informed.' },
              { icon: '💰', title: 'Honest Pricing', desc: 'What you see is what you pay. No hidden charges. Great value for great food.' },
              { icon: '🫶', title: 'Made with Love', desc: 'Every dish is cooked with care — just like home. Traditional recipes, authentic taste.' },
              { icon: '🔒', title: 'Safe Ordering', desc: 'Secure UPI payments. Your data is private. 100% contactless option available.' },
              { icon: '🎯', title: 'Live Updates', desc: 'Know exactly when your food is ready. No more guessing or waiting in the dark.' },
            ].map(w => (
              <div key={w.title} className="lp-why-card">
                <div className="lp-why-icon">{w.icon}</div>
                <h3>{w.title}</h3>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pickup Banner ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-pickup-banner">
            <div className="lp-pickup-left">
              <div className="lp-pickup-tag">⚡ Ready in minutes</div>
              <h2>Skip the Queue with Pickup</h2>
              <p>Order ahead online, walk in when it's ready. Pay at counter. No waiting, no stress.</p>
              <Link to="/order?type=pickup">
                <button className="lp-cta-primary" style={{ fontSize: '0.95rem', padding: '0.85rem 1.75rem' }}>
                  🛍 Order for Pickup
                </button>
              </Link>
            </div>
            <div className="lp-pickup-right">
              <div className="lp-pickup-steps">
                {['Order online in 60 sec', 'Kitchen starts immediately', 'Walk in & collect'].map((s, i) => (
                  <div key={s} className="lp-pickup-step">
                    <span className="lp-pickup-step-num">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <h2>❤️ What Customers Say</h2>
            <p>Real reviews from real customers</p>
          </div>
          <div className="lp-reviews-grid">
            {[
              { name: 'Rahul M.', review: 'Best dal tadka in the area. Always fresh, always on time. I order pickup almost every day!', stars: 5, tag: 'Regular Customer' },
              { name: 'Priya S.', review: 'Live tracking is amazing. I knew exactly when my roti was ready. The QR table ordering is so smooth!', stars: 5, tag: 'Dine-in Fan' },
              { name: 'Vikram K.', review: 'Home delivery was quick and hot. The thali is fantastic value. Will order again for sure.', stars: 5, tag: 'Delivery Customer' },
            ].map(r => (
              <div key={r.name} className="lp-review-card">
                <div className="lp-review-stars">{'⭐'.repeat(r.stars)}</div>
                <p className="lp-review-text">"{r.review}"</p>
                <div className="lp-review-author">
                  <div className="lp-review-avatar">{r.name.charAt(0)}</div>
                  <div>
                    <div className="lp-review-name">{r.name}</div>
                    <div className="lp-review-tag">{r.tag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-section lp-section-dark">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🍛</div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '0.5rem' }}>
            Ready to Order Fresh Food?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '2rem', fontSize: '1rem', maxWidth: 480, margin: '0 auto 2rem' }}>
            {settings.phone && <>Call us: <strong style={{ color: 'var(--gold-light)' }}>{settings.phone}</strong> · </>}
            Fresh food every day · Live tracking · Multiple order options
          </p>
          <div className="lp-cta-row" style={{ justifyContent: 'center' }}>
            <Link to="/order" style={{ textDecoration: 'none' }}>
              <button className="lp-cta-primary" style={{ fontSize: '1.1rem', padding: '1rem 2.25rem' }}>
                🛍 Order Now
              </button>
            </Link>
            {customer ? (
              <Link to={myOrdersPath} style={{ textDecoration: 'none' }}>
                <button className="lp-cta-secondary">
                  {isCustomerLoggedIn ? '👤 My Account' : '📋 My Orders'}
                </button>
              </Link>
            ) : (
              <Link to="/customer/login" style={{ textDecoration: 'none' }}>
                <button className="lp-cta-secondary">Sign In / Register</button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span style={{ fontSize: '1.5rem' }}>🍛</span>
            <span className="lp-footer-name">{dhabaName}</span>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Order</div>
              <Link to="/order" className="lp-footer-link">Pickup</Link>
              {settings.deliveryEnabled !== false && <Link to="/order?type=delivery" className="lp-footer-link">Delivery</Link>}
              <Link to="/my-orders" className="lp-footer-link">Track Order</Link>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Account</div>
              <Link to="/customer/login" className="lp-footer-link">Sign In</Link>
              <Link to="/customer/account" className="lp-footer-link">My Orders</Link>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Info</div>
              {settings.address && <span className="lp-footer-text">📍 {settings.address}</span>}
              {settings.phone && <span className="lp-footer-text">📞 {settings.phone}</span>}
              <Link to="/login" className="lp-footer-link" style={{ opacity: 0.5 }}>Staff Login</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} {dhabaName} · Freshness guaranteed daily 🌿
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
