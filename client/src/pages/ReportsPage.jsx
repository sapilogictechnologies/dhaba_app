import { useState } from 'react';
import { useGetDailyReportQuery, useLazyExportReportCsvQuery } from '../api/reportApi.js';
import { useGetExpensesQuery } from '../api/expenseApi.js';
import { useToast } from '../components/Toast.jsx';

const today = new Date().toISOString().slice(0, 10);

const MetricBox = ({ label, value, highlight, warn, sub, big }) => (
  <div
    className="panel"
    style={{
      margin: 0, textAlign: 'center', padding: '0.85rem 0.75rem',
      border: highlight ? '2px solid var(--navy)' : warn ? '1px solid #fbbf24' : undefined,
      background: highlight ? 'linear-gradient(135deg,#e8eef7,#f0f4fb)' : undefined
    }}
  >
    <div style={{
      fontSize: big ? '1.6rem' : '1.25rem', fontWeight: 700,
      color: highlight ? 'var(--navy)' : warn ? '#b45309' : 'var(--text)'
    }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</div>
    {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
  </div>
);

const ReportsPage = () => {
  const [date, setDate] = useState(today);
  const toast = useToast();
  const { data, isLoading, error } = useGetDailyReportQuery(date);
  const { data: expenseData } = useGetExpensesQuery({ date });
  const [exportCsv, exportState] = useLazyExportReportCsvQuery();
  const report = data?.data?.report;
  const expenses = expenseData?.data?.expenses || [];
  const totalExpenses = expenseData?.data?.total || 0;
  const totalSales = report?.totalSales ?? 0;
  const netProfit = totalSales - totalExpenses;

  const download = async () => {
    try {
      const response = await exportCsv(date).unwrap();
      const blob = new Blob([response.data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = response.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast('CSV downloaded', 'success');
    } catch (err) {
      toast(err?.data?.message || 'Export failed', 'error');
    }
  };

  return (
    <section className="shell">
      <div className="page-header">
        <h1>Daily Reports</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
          <button className="primary sm" onClick={download} disabled={exportState.isFetching || !report}>
            {exportState.isFetching ? 'Exporting…' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error?.data?.message || 'Could not load report'}</div>}
      {isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner"></span></div>}

      {report && (
        <>
          {/* P&L Summary */}
          <div className="panel" style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', color: '#fff', marginBottom: '1.25rem' }}>
            <h2 style={{ color: 'var(--gold-light)', margin: '0 0 1rem' }}>Profit & Loss — {date}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>₹{totalSales.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem' }}>💰 Total Sales</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171' }}>₹{totalExpenses.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem' }}>💸 Expenses</div>
              </div>
              <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', gridColumn: expenses.length > 0 ? 'auto' : 'span 2' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: netProfit >= 0 ? '#4ade80' : '#f87171' }}>
                  {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem' }}>
                  {netProfit >= 0 ? '📈 Net Profit' : '📉 Net Loss'}
                </div>
              </div>
            </div>
          </div>

          {/* Sales metrics */}
          <div style={{ marginBottom: '0.75rem' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Sales Breakdown</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
            <MetricBox label="Total Sales" value={`₹${(report.totalSales ?? 0).toLocaleString('en-IN')}`} highlight big />
            <MetricBox label="💵 Cash" value={`₹${report.cashSales ?? 0}`} />
            <MetricBox label="📱 UPI" value={`₹${report.upiSales ?? 0}`} />
            <MetricBox label="🔀 Mixed" value={`₹${report.mixedSales ?? 0}`} />
            <MetricBox label="⏳ Pending" value={`₹${report.pendingAmount ?? 0}`} warn={(report.pendingAmount ?? 0) > 0} />
            <MetricBox label="📦 Total Orders" value={report.totalOrders ?? 0} />
            <MetricBox label="🧾 Bills Issued" value={report.totalBills ?? 0} />
            <MetricBox label="✅ Completed" value={report.completedOrders ?? 0} />
            <MetricBox label="❌ Cancelled" value={report.cancelledOrders ?? 0} warn={(report.cancelledOrders ?? 0) > 0} />
            <MetricBox label="🚴 Delivery" value={report.onlineDeliveryOrders ?? 0} />
            <MetricBox label="🛍 Pickup" value={report.onlinePickupOrders ?? 0} />
            <MetricBox label="🪑 Table" value={report.tableOrders ?? 0} />
            <MetricBox label="📦 Takeaway" value={report.takeawayOrders ?? 0} />
            <MetricBox label="📞 Phone" value={report.phoneOrders ?? 0} />
          </div>

          {/* Top items */}
          {report.topItems?.length > 0 && (
            <div className="panel" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--navy)' }}>🏆 Top Selling Items</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Item</th><th>Qty Sold</th><th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topItems.map((item, idx) => (
                      <tr key={item.itemName}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                        <td><span className="badge badge-blue">{item.qty}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{item.amount ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses for the day */}
          {expenses.length > 0 && (
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--navy)' }}>💸 Expenses</h3>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>Total: ₹{totalExpenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Category</th><th>Description</th><th>Mode</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp._id}>
                        <td><span className="badge badge-navy" style={{ fontSize: '0.72rem' }}>{exp.category.replace(/_/g, ' ')}</span></td>
                        <td style={{ fontSize: '0.875rem' }}>{exp.description || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{exp.paymentMode}</td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₹{exp.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!report.topItems || report.topItems.length === 0) && expenses.length === 0 && (
            <div className="empty-state">
              <div className="icon">📊</div>
              <p>No orders or expenses on this date</p>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ReportsPage;
