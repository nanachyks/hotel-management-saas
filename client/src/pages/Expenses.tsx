import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useCurrency } from '../context/CurrencyContext';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';

interface Expense { id: string; category: string; description: string; amount: number; date: string; notes: string; }

const categories = ['utilities', 'supplies', 'maintenance', 'salary', 'marketing', 'food', 'transport', 'other'];

export default function Expenses() {
  const { toast } = useToast();
  const { f } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: 'other', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ data: Expense[] }>(`/expenses${filterCat ? `?category=${filterCat}` : ''}`)
      .then(r => setExpenses(r.data || r as any))
      .catch(() => toast('Failed to load expenses', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterCat]);

  const openNew = () => { setEdit(null); setForm({ category: 'other', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }); setShowForm(true); };
  const openEdit = (e: Expense) => { setEdit(e); setForm({ category: e.category, description: e.description, amount: String(e.amount), date: e.date, notes: e.notes || '' }); setShowForm(true); };

  const save = async () => {
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (edit) { await api.put(`/expenses/${edit.id}`, body); toast('Expense updated', 'success'); }
      else { await api.post('/expenses', body); toast('Expense created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/expenses/${id}`); toast('Expense deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Expenses</h1>
        <button onClick={openNew} style={btn}>+ New Expense</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...select, width: 180 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ fontSize: 14, color: colors.slate }}>Total: <span style={{ color: colors.danger, fontWeight: 600 }}>{f(total)}</span></div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Expense' : 'New Expense'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={select}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={input} />
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={input} />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} />
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={6} /> : expenses.length === 0 ? (
        <p style={{ color: colors.slate }}>No expenses recorded yet. Click "+ New Expense" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Date</th><th style={th}>Category</th><th style={th}>Description</th><th style={th}>Amount</th><th style={th}>Notes</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{e.date}</td>
                  <td style={td}><span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 13 }}>{e.category}</span></td>
                  <td style={{ ...td, fontWeight: 600, color: colors.dark }}>{e.description}</td>
                  <td style={{ ...td, color: colors.danger, fontWeight: 600 }}>{f(e.amount)}</td>
                  <td style={{ ...td, fontSize: 13, color: colors.slate }}>{e.notes || '-'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(e)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: e.id, description: e.description })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${confirmDelete?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
