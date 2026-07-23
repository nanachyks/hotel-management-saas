import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency } from '../styles';

interface Item {
  id: string; name: string; category: string; quantity: number; unit: string;
  min_stock: number; cost_price: number; notes: string;
}
interface Transaction {
  id: string; type: string; quantity: number; reference: string; notes: string; created_at: string;
}

const categories = ['toiletries', 'linens', 'minibar', 'cleaning', 'maintenance', 'office', 'other'];

export default function Inventory() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: '', category: 'supplies', quantity: '', unit: 'piece', min_stock: '', cost_price: '', notes: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [txnModal, setTxnModal] = useState<{ item: Item; type: string; quantity: string; reference: string; notes: string } | null>(null);
  const [txnLog, setTxnLog] = useState<{ item: Item; txns: Transaction[] } | null>(null);

  const load = () => {
    setLoading(true);
    let url = '/inventory/items';
    const qs: string[] = [];
    if (filterCat) qs.push(`category=${filterCat}`);
    if (lowStockOnly) qs.push('low_stock=true');
    if (qs.length) url += '?' + qs.join('&');
    api.get<{ data: Item[] }>(url)
      .then(r => setItems(r.data || r as any))
      .catch(() => toast('Failed to load inventory', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterCat, lowStockOnly]);

  const openNew = () => { setEdit(null); setForm({ name: '', category: 'supplies', quantity: '0', unit: 'piece', min_stock: '0', cost_price: '0', notes: '' }); setShowForm(true); };
  const openEdit = (e: Item) => { setEdit(e); setForm({ name: e.name, category: e.category, quantity: String(e.quantity), unit: e.unit, min_stock: String(e.min_stock), cost_price: String(e.cost_price), notes: e.notes }); setShowForm(true); };

  const save = async () => {
    try {
      const body = { ...form, quantity: Number(form.quantity), min_stock: Number(form.min_stock), cost_price: Number(form.cost_price) };
      if (edit) { await api.put(`/inventory/items/${edit.id}`, body); toast('Item updated', 'success'); }
      else { await api.post('/inventory/items', body); toast('Item created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try { await api.del(`/inventory/items/${confirmDelete}`); toast('Item deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const openTxn = (item: Item, type: string) => {
    setTxnModal({ item, type, quantity: '1', reference: '', notes: '' });
  };

  const submitTxn = async () => {
    if (!txnModal) return;
    try {
      const res = await api.post<{ new_quantity: number }>(`/inventory/items/${txnModal.item.id}/transactions`, {
        type: txnModal.type, quantity: Number(txnModal.quantity), reference: txnModal.reference, notes: txnModal.notes,
      });
      toast(`Stock ${txnModal.type === 'in' ? 'added' : txnModal.type === 'out' ? 'removed' : 'adjusted'} (new: ${res.new_quantity})`, 'success');
      setTxnModal(null); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const openTxnLog = async (item: Item) => {
    try {
      const res = await api.get<{ data: Transaction[] }>(`/inventory/items/${item.id}/transactions`);
      setTxnLog({ item, txns: res.data || res as any });
    } catch { toast('Failed to load transactions', 'error'); }
  };

  const totalValue = items.reduce((s, i) => s + i.quantity * i.cost_price, 0);
  const lowCount = items.filter(i => i.min_stock > 0 && i.quantity <= i.min_stock).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Inventory</h1>
        <button onClick={openNew} style={btn}>+ New Item</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...select, width: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ fontSize: 14, color: colors.slate, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
          Low stock only {lowCount > 0 && <span style={{ color: colors.warning, fontWeight: 600 }}>({lowCount})</span>}
        </label>
        <div style={{ fontSize: 14, color: colors.slate }}>
          Total Value: <span style={{ color: colors.primary, fontWeight: 600 }}>{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Item' : 'New Inventory Item'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <input placeholder="Item name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={select}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="1" placeholder="Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={input} />
            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={select}>
              <option value="piece">Piece</option><option value="set">Set</option><option value="bottle">Bottle</option>
              <option value="can">Can</option><option value="roll">Roll</option><option value="bag">Bag</option>
              <option value="box">Box</option><option value="canister">Canister</option><option value="ream">Ream</option>
              <option value="pack">Pack</option>
            </select>
            <input type="number" step="1" placeholder="Min stock alert" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} style={input} />
            <input type="number" step="0.01" placeholder="Cost price" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} style={input} />
            <input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={6} /> : items.length === 0 ? (
        <p style={{ color: colors.slate }}>No inventory items yet. Click "+ New Item" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Category</th><th style={th}>Qty</th><th style={th}>Unit</th>
                <th style={th}>Min</th><th style={th}>Cost</th><th style={th}>Value</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const isLow = i.min_stock > 0 && i.quantity <= i.min_stock;
                return (
                  <tr key={i.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={td}>
                      <span style={{ fontWeight: 500 }}>{i.name}</span>
                      {i.notes && <div style={{ fontSize: 12, color: colors.slate }}>{i.notes}</div>}
                    </td>
                    <td style={td}><span style={{ fontSize: 13, color: colors.slate, textTransform: 'capitalize' }}>{i.category}</span></td>
                    <td style={{ ...td, fontWeight: 600, color: isLow ? colors.warning : colors.dark }}>{i.quantity}</td>
                    <td style={td}>{i.unit}</td>
                    <td style={td}>{i.min_stock > 0 ? i.min_stock : '-'}</td>
                    <td style={td}>{formatCurrency(i.cost_price)}</td>
                    <td style={td}>{formatCurrency(i.quantity * i.cost_price)}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => openTxn(i, 'in')} style={{ ...btnSm, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'none', padding: '4px 10px' }}>+In</button>
                        <button onClick={() => openTxn(i, 'out')} style={{ ...btnSm, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'none', padding: '4px 10px' }}>-Out</button>
                        <button onClick={() => openTxnLog(i)} style={{ ...btnSm, color: colors.slate, border: 'none', padding: '4px 10px' }}>Log</button>
                        <button onClick={() => openEdit(i)} style={{ ...btnSm, color: colors.slate, border: 'none', padding: '4px 10px' }}>Edit</button>
                        <button onClick={() => setConfirmDelete(i.id)} style={{ ...btnSm, color: colors.danger, border: 'none', padding: '4px 10px' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {txnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
             onClick={() => setTxnModal(null)}>
          <div style={{ ...card, width: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={sectionTitle}>{txnModal.type === 'in' ? 'Add Stock' : txnModal.type === 'out' ? 'Remove Stock' : 'Adjust Stock'}</h2>
            <p style={{ fontSize: 14, color: colors.slate, marginBottom: 14 }}>{txnModal.item.name} (current: {txnModal.item.quantity} {txnModal.item.unit})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="number" step="1" placeholder="Quantity" value={txnModal.quantity}
                onChange={e => setTxnModal({ ...txnModal, quantity: e.target.value })} style={input} />
              <input placeholder="Reference (PO#, Room#, etc.)" value={txnModal.reference}
                onChange={e => setTxnModal({ ...txnModal, reference: e.target.value })} style={input} />
              <input placeholder="Notes" value={txnModal.notes}
                onChange={e => setTxnModal({ ...txnModal, notes: e.target.value })} style={input} />
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button onClick={submitTxn} style={btn}>Submit</button>
              <button onClick={() => setTxnModal(null)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {txnLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
             onClick={() => setTxnLog(null)}>
          <div style={{ ...card, width: 500, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={sectionTitle}>{txnLog.item.name} — Transaction Log</h2>
            {txnLog.txns.length === 0 ? (
              <p style={{ color: colors.slate }}>No transactions recorded yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={th}>Date</th><th style={th}>Type</th><th style={th}>Qty</th><th style={th}>Reference</th><th style={th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {txnLog.txns.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={td}>{t.created_at?.split('T')[0]}</td>
                      <td style={td}><span style={{
                        color: t.type === 'in' ? '#22c55e' : t.type === 'out' ? '#ef4444' : '#f59e0b',
                        fontWeight: 600, textTransform: 'uppercase', fontSize: 12,
                      }}>{t.type}</span></td>
                      <td style={td}>{t.quantity}</td>
                      <td style={td}>{t.reference || '-'}</td>
                      <td style={td}>{t.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setTxnLog(null)} style={{ ...btnSm, color: colors.slate }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          message="Delete this inventory item? This will also remove all transaction history."
          onConfirm={remove}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
