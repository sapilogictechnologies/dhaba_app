import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateMenuItemMutation,
  useDeleteMenuItemMutation,
  useGetMenuQuery,
  useToggleMenuItemMutation,
  useUpdateMenuItemMutation,
  useUpdateMenuStockMutation
} from '../api/menuApi.js';
import { useToast } from '../components/Toast.jsx';

const CATEGORIES = ['Roti', 'Sabzi', 'Dal', 'Rice', 'Snacks', 'Drinks', 'Thali', 'Sweets', 'Meals', 'Other'];

const blank = { name: '', category: 'Roti', price: '', description: '', prepTimeMinutes: 15, isVeg: true };

const MenuPage = () => {
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const { data, isLoading, error } = useGetMenuQuery();
  const [createMenuItem, createState] = useCreateMenuItemMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [toggleMenuItem] = useToggleMenuItemMutation();
  const [updateMenuStock] = useUpdateMenuStockMutation();
  const [deleteMenuItem] = useDeleteMenuItemMutation();
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  const menu = data?.data?.menu || [];
  const existingCats = [...new Set(menu.map((i) => i.category))];
  const allCats = [...new Set([...CATEGORIES, ...existingCats])];
  const filtered = menu.filter((item) => {
    const matchCat = !filterCat || item.category === filterCat;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const act = async (fn, msg) => {
    try { await fn(); toast(msg, 'success'); }
    catch (err) { toast(err.data?.message || 'Failed', 'error'); }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return toast('Name and price required', 'warn');
    await act(
      () => createMenuItem({ ...form, price: Number(form.price), prepTimeMinutes: Number(form.prepTimeMinutes) }).unwrap(),
      `${form.name} added`
    );
    setForm(blank);
  };

  const saveEdit = (item) => {
    act(
      () => updateMenuItem({ id: item._id, ...editForm, price: Number(editForm.price), prepTimeMinutes: Number(editForm.prepTimeMinutes) }).unwrap(),
      `${item.name} updated`
    );
    setEditId(null);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <section className="shell">
      <div className="page-header"><h1>Menu</h1></div>

      {error && <div className="alert alert-error">{error.data?.message}</div>}

      {/* Add item (admin only) */}
      {isAdmin && (
        <div className="panel">
          <h2>Add Menu Item</h2>
          <form onSubmit={submitCreate}>
            <div className="form-grid">
              <label>Item Name *
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paneer Butter Masala" required />
              </label>
              <label>Category *
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>Price (₹) *
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min="0" required />
              </label>
              <label>Prep Time (min)
                <input type="number" value={form.prepTimeMinutes} onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })} min="1" />
              </label>
              <label>Description
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </label>
              <label className="checkbox" style={{ alignSelf: 'flex-end', paddingBottom: '0.55rem' }}>
                <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} />
                Veg
              </label>
            </div>
            <button type="submit" className="primary" style={{ marginTop: '0.75rem' }} disabled={createState.isLoading}>
              {createState.isLoading ? 'Adding…' : '+ Add Item'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search items…" style={{ maxWidth: 220 }} />
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button className={!filterCat ? 'primary sm' : 'sm'} onClick={() => setFilterCat('')}>All</button>
          {existingCats.map((cat) => (
            <button key={cat} className={filterCat === cat ? 'primary sm' : 'sm'} onClick={() => setFilterCat(cat)} style={{ whiteSpace: 'nowrap' }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#78716c' }}>
        <span>Total: {menu.length}</span>
        <span>Showing: {filtered.length}</span>
        <span style={{ color: '#16a34a' }}>Available: {menu.filter((i) => i.isAvailable && i.stockStatus === 'IN_STOCK').length}</span>
        <span style={{ color: '#dc2626' }}>Out of Stock: {menu.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length}</span>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner"></span></div>}

      {/* Menu table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Category</th><th>Price</th><th>Prep</th>
              <th>Available</th><th>Stock</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item._id}>
                {editId === item._id ? (
                  <>
                    <td><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="small-input" style={{ maxWidth: '100%' }} /></td>
                    <td>
                      <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={{ width: 'auto' }}>
                        {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="small-input" /></td>
                    <td><input type="number" value={editForm.prepTimeMinutes} onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: e.target.value })} className="small-input" /></td>
                    <td colSpan="2">
                      <input value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" style={{ maxWidth: '100%' }} />
                    </td>
                    <td>
                      <div className="actions">
                        <button className="success sm" onClick={() => saveEdit(item)}>✓ Save</button>
                        <button className="sm" onClick={() => setEditId(null)}>✗</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <strong>{item.name}</strong>
                      {item.isVeg !== undefined && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>{item.isVeg ? '🟢' : '🔴'}</span>}
                      {item.description && <div style={{ fontSize: '0.78rem', color: '#78716c' }}>{item.description}</div>}
                    </td>
                    <td><span className="badge badge-gray">{item.category}</span></td>
                    <td>₹{item.price}</td>
                    <td>{item.prepTimeMinutes}m</td>
                    <td>
                      <span className={`badge ${item.isAvailable ? 'badge-green' : 'badge-gray'}`}>
                        {item.isAvailable ? 'Shown' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`sm ${item.stockStatus === 'OUT_OF_STOCK' ? 'danger' : 'success'}`}
                        onClick={() => act(
                          () => updateMenuStock({ id: item._id, stockStatus: item.stockStatus === 'IN_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK' }).unwrap(),
                          item.stockStatus === 'IN_STOCK' ? `${item.name} marked out of stock` : `${item.name} back in stock`
                        )}
                      >
                        {item.stockStatus === 'IN_STOCK' ? '✓ In Stock' : '✗ Out'}
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="actions">
                          <button className="sm" onClick={() => { setEditId(item._id); setEditForm({ name: item.name, category: item.category, price: item.price, prepTimeMinutes: item.prepTimeMinutes, description: item.description || '' }); }}>✏</button>
                          <button className="sm" onClick={() => act(() => toggleMenuItem({ id: item._id, isAvailable: !item.isAvailable }).unwrap(), item.isAvailable ? `${item.name} hidden` : `${item.name} shown`)}>
                            {item.isAvailable ? '👁 Hide' : '👁 Show'}
                          </button>
                          <button className="danger sm" onClick={() => {
                            if (window.confirm(`Delete ${item.name}?`))
                              act(() => deleteMenuItem(item._id).unwrap(), `${item.name} deleted`);
                          }}>Del</button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <div className="empty-state"><div className="icon">🍽</div><p>No items found</p></div>
        )}
      </div>
    </section>
  );
};

export default MenuPage;
