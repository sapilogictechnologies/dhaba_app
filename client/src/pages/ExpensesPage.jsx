import { useState } from 'react';
import {
  useGetExpensesQuery,
  useGetExpenseSummaryQuery,
  useAddExpenseMutation,
  useDeleteExpenseMutation
} from '../api/expenseApi.js';
import { useToast } from '../components/Toast.jsx';

const CATEGORIES = [
  { value: 'RAW_MATERIAL', label: '🥬 Raw Material' },
  { value: 'STAFF_SALARY', label: '👷 Staff Salary' },
  { value: 'RENT', label: '🏠 Rent' },
  { value: 'ELECTRICITY', label: '⚡ Electricity' },
  { value: 'GAS', label: '🔥 Gas / LPG' },
  { value: 'DELIVERY', label: '🚴 Delivery' },
  { value: 'MAINTENANCE', label: '🔧 Maintenance' },
  { value: 'MARKETING', label: '📣 Marketing' },
  { value: 'OTHER', label: '📦 Other' }
];

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = { date: today, category: '', description: '', amount: '', paymentMode: 'CASH', note: '' };

const ExpensesPage = () => {
  const toast = useToast();
  const [dateFilter, setDateFilter] = useState(today);
  const [tab, setTab] = useState('today');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const params = tab === 'today' ? { date: dateFilter } : { startDate: firstOfMonth, endDate: today };

  const { data, isLoading, error } = useGetExpensesQuery(params);
  const { data: summaryData } = useGetExpenseSummaryQuery({ startDate: firstOfMonth, endDate: today });
  const [addExpense, addState] = useAddExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const expenses = data?.data?.expenses || [];
  const total = data?.data?.total || 0;
  const summary = summaryData?.data?.summary || [];
  const monthTotal = summaryData?.data?.grandTotal || 0;

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast('Select a category', 'warn');
    if (!form.amount || Number(form.amount) <= 0) return toast('Enter a valid amount', 'warn');
    try {
      await addExpense(form).unwrap();
      toast('Expense added ✓', 'success');
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      toast(err?.data?.message || 'Failed to add expense', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id).unwrap();
      toast('Expense deleted', 'success');
    } catch (err) {
      toast(err?.data?.message || 'Failed to delete', 'error');
    }
  };

  return (
    <section className="shell">
      <div className="page-header">
        <h1>Expenses</h1>
        <button className="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #e8eef7 0%, #f0f4fb 100%)', border: '1px solid #c0d0e8', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--navy)' }}>This Month Summary</h2>
          <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--danger)' }}>₹{monthTotal.toLocaleString('en-IN')}</span>
        </div>
        {summary.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
            {summary.map((item) => {
              const cat = CATEGORIES.find((c) => c.value === item._id);
              return (
                <div key={item._id} style={{ background: '#fff', borderRadius: 10, padding: '0.65rem 0.75rem', border: '1px solid #c0d0e8' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    {cat?.label || item._id}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1rem' }}>₹{item.total.toLocaleString('en-IN')}</div>
                </div>
              );
            })}
          </div>
        )}
        {summary.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No expenses this month</div>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <form className="panel" onSubmit={submit} style={{ border: '2px solid var(--navy)', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--navy)' }}>Add New Expense</h3>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <label>Date *
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} max={today} />
            </label>
            <label>Category *
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label>Amount (₹) *
              <input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} min="1" placeholder="0" />
            </label>
            <label>Payment Mode
              <select value={form.paymentMode} onChange={(e) => set('paymentMode', e.target.value)}>
                <option value="CASH">💵 Cash</option>
                <option value="UPI">📱 UPI</option>
                <option value="OTHER">🔄 Other</option>
              </select>
            </label>
            <label style={{ gridColumn: '1/-1' }}>Description
              <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Vegetables from market" />
            </label>
            <label style={{ gridColumn: '1/-1' }}>Note
              <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Optional note" />
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="primary" disabled={addState.isLoading}>
              {addState.isLoading ? 'Saving…' : '✓ Add Expense'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Tab selector */}
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={`tab-btn ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
        <button className={`tab-btn ${tab === 'month' ? 'active' : ''}`} onClick={() => setTab('month')}>This Month</button>
      </div>

      {tab === 'today' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: 'auto' }} />
          {total > 0 && (
            <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.95rem' }}>Total: ₹{total.toLocaleString('en-IN')}</span>
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error?.data?.message || 'Failed to load expenses'}</div>}
      {isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner"></span></div>}

      {expenses.length === 0 && !isLoading && (
        <div className="empty-state">
          <div className="icon">💰</div>
          <p>No expenses found for this period</p>
          <button className="primary" onClick={() => setShowForm(true)}>+ Add First Expense</button>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Mode</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => {
                const cat = CATEGORIES.find((c) => c.value === expense.category);
                return (
                  <tr key={expense._id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td>
                      <span className="badge badge-navy" style={{ fontSize: '0.72rem' }}>
                        {cat?.label || expense.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {expense.description}
                      {expense.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{expense.note}</div>}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {expense.paymentMode === 'CASH' ? '💵' : expense.paymentMode === 'UPI' ? '📱' : '🔄'} {expense.paymentMode}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>₹{expense.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <button className="danger sm" onClick={() => handleDelete(expense._id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {expenses.length > 0 && (
        <div style={{ marginTop: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: 'var(--danger)' }}>
          Total: ₹{total.toLocaleString('en-IN')}
        </div>
      )}
    </section>
  );
};

export default ExpensesPage;
