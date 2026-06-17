import { useEffect, useRef, useState } from 'react';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../api/settingsApi.js';
import { useToast } from '../components/Toast.jsx';

const Section = ({ title, children }) => (
  <div className="form-section">
    <h3>{title}</h3>
    {children}
  </div>
);

const SettingsPage = () => {
  const toast = useToast();
  const { data, isLoading, error } = useGetSettingsQuery();
  const [updateSettings, updateState] = useUpdateSettingsMutation();
  const [form, setForm] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (data?.data?.settings) setForm(data.data.settings);
  }, [data]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setCharge = (field, value) =>
    setForm((f) => ({ ...f, deliveryCharges: { ...f.deliveryCharges, [field]: Number(value) } }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await updateSettings({
        dhabaName: form.dhabaName,
        phone: form.phone,
        address: form.address,
        upiId: form.upiId,
        deliveryEnabled: Boolean(form.deliveryEnabled),
        minDeliveryOrderAmount: Number(form.minDeliveryOrderAmount),
        maxDeliveryDistanceKm: Number(form.maxDeliveryDistanceKm),
        deliveryChargePerKm: Number(form.deliveryChargePerKm),
        acceptanceWindowMinutes: Number(form.acceptanceWindowMinutes),
        orderPrefix: form.orderPrefix,
        kotPrefix: form.kotPrefix,
        billPrefix: form.billPrefix,
        deliveryCharges: form.deliveryCharges,
        soundEnabled: Boolean(form.soundEnabled),
        defaultPrepMinutes: Number(form.defaultPrepMinutes),
        queueDelayPerOrderMinutes: Number(form.queueDelayPerOrderMinutes),
        businessOpen: Boolean(form.businessOpen),
        announcementText: form.announcementText,
        taxEnabled: Boolean(form.taxEnabled),
        taxPercent: Number(form.taxPercent),
        discountEnabled: Boolean(form.discountEnabled)
      }).unwrap();
      toast('Settings saved successfully', 'success');
    } catch (err) {
      toast(err.data?.message || 'Failed to save settings', 'error');
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner"></span></div>;

  return (
    <section className="shell">
      <div className="page-header"><h1>Settings</h1></div>
      {error && <div className="alert alert-error">{error.data?.message || 'Failed to load settings'}</div>}

      <form onSubmit={submit}>
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          {/* Left column */}
          <div>
            <div className="panel">
              <Section title="🍛 Dhaba Profile">
                <div className="form-grid">
                  <label>Dhaba Name
                    <input value={form.dhabaName || ''} onChange={(e) => set('dhabaName', e.target.value)} />
                  </label>
                  <label>Phone
                    <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
                  </label>
                  <label style={{ gridColumn: '1/-1' }}>Address
                    <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
                  </label>
                  <label style={{ gridColumn: '1/-1' }}>Announcement / Notice
                    <input value={form.announcementText || ''} onChange={(e) => set('announcementText', e.target.value)} placeholder="Shown on customer ordering page" />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <label className="checkbox">
                    <input type="checkbox" checked={Boolean(form.businessOpen !== false)} onChange={(e) => set('businessOpen', e.target.checked)} />
                    Business Open
                  </label>
                </div>
              </Section>
            </div>

            <div className="panel">
              <Section title="💳 UPI / Payment">
                <div className="form-grid">
                  <label>UPI ID
                    <input value={form.upiId || ''} onChange={(e) => set('upiId', e.target.value)} placeholder="yourname@bank" />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <label className="checkbox">
                    <input type="checkbox" checked={Boolean(form.taxEnabled)} onChange={(e) => set('taxEnabled', e.target.checked)} />
                    Enable Tax
                  </label>
                  {form.taxEnabled && (
                    <label style={{ width: 120 }}>Tax %
                      <input type="number" value={form.taxPercent || 5} onChange={(e) => set('taxPercent', e.target.value)} min="0" max="30" />
                    </label>
                  )}
                  <label className="checkbox">
                    <input type="checkbox" checked={Boolean(form.discountEnabled)} onChange={(e) => set('discountEnabled', e.target.checked)} />
                    Enable Discount
                  </label>
                </div>
              </Section>
            </div>

            <div className="panel">
              <Section title="🏷 Order Prefixes">
                <div className="form-grid">
                  <label>Order Prefix
                    <input value={form.orderPrefix || 'ORD-'} onChange={(e) => set('orderPrefix', e.target.value)} />
                  </label>
                  <label>KOT Prefix
                    <input value={form.kotPrefix || 'KOT-'} onChange={(e) => set('kotPrefix', e.target.value)} />
                  </label>
                  <label>Bill Prefix
                    <input value={form.billPrefix || 'BILL-'} onChange={(e) => set('billPrefix', e.target.value)} />
                  </label>
                </div>
              </Section>
            </div>
          </div>

          {/* Right column */}
          <div>
            <div className="panel">
              <Section title="🚴 Delivery Settings">
                <label className="checkbox" style={{ marginBottom: '0.75rem' }}>
                  <input type="checkbox" checked={Boolean(form.deliveryEnabled)} onChange={(e) => set('deliveryEnabled', e.target.checked)} />
                  Delivery Enabled
                </label>
                <div className="form-grid">
                  <label>Max Delivery Distance (km)
                    <input type="number" value={form.maxDeliveryDistanceKm ?? 3} onChange={(e) => set('maxDeliveryDistanceKm', e.target.value)} min="0.5" max="20" step="0.5" />
                  </label>
                  <label>Delivery Charge per km (₹)
                    <input type="number" value={form.deliveryChargePerKm ?? 20} onChange={(e) => set('deliveryChargePerKm', e.target.value)} min="0" />
                  </label>
                  <label>Min Order Amount (₹)
                    <input type="number" value={form.minDeliveryOrderAmount ?? 200} onChange={(e) => set('minDeliveryOrderAmount', e.target.value)} min="0" />
                  </label>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Customer enters distance in km. Charge = distance × ₹{form.deliveryChargePerKm ?? 20}/km. Orders beyond {form.maxDeliveryDistanceKm ?? 3} km are blocked.
                </p>
              </Section>
            </div>

            <div className="panel">
              <Section title="⏱ Timing & ETA">
                <div className="form-grid">
                  <label>Online Order Acceptance Window (min)
                    <input type="number" value={form.acceptanceWindowMinutes ?? 10} onChange={(e) => set('acceptanceWindowMinutes', e.target.value)} min="1" />
                  </label>
                  <label>Default Prep Time (min)
                    <input type="number" value={form.defaultPrepMinutes ?? 15} onChange={(e) => set('defaultPrepMinutes', e.target.value)} min="1" />
                  </label>
                  <label>Queue Delay Per Order (min)
                    <input type="number" value={form.queueDelayPerOrderMinutes ?? 5} onChange={(e) => set('queueDelayPerOrderMinutes', e.target.value)} min="0" />
                  </label>
                </div>
              </Section>
            </div>

            <div className="panel">
              <Section title="🔊 Sound Notifications">
                <label className="checkbox">
                  <input type="checkbox" checked={Boolean(form.soundEnabled)} onChange={(e) => set('soundEnabled', e.target.checked)} />
                  Sound Alerts Enabled
                </label>
                <p style={{ fontSize: '0.8rem', color: '#78716c', marginTop: '0.5rem' }}>
                  Different alert tones play for each order type. Kitchen, staff, and admin all receive relevant alerts.
                </p>
              </Section>
            </div>
          </div>
        </div>

        <div className="panel" style={{ position: 'sticky', bottom: 0, zIndex: 10, borderTop: '2px solid #d97706' }}>
          <div className="actions">
            <button type="submit" className="primary lg" disabled={updateState.isLoading}>
              {updateState.isLoading ? 'Saving…' : '💾 Save All Settings'}
            </button>
            {updateState.isSuccess && <span className="ok">✓ Saved</span>}
          </div>
        </div>
      </form>
    </section>
  );
};

export default SettingsPage;
