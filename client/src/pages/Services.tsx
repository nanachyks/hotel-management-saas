import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency } from '../styles';
import { Download } from 'lucide-react';

interface Service { id: string; name: string; description: string; price: number; category: string; }

export default function Services() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'general' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Service[]>('/services')
      .then(setServices)
      .catch(() => toast('Failed to load services', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ name: '', description: '', price: '', category: 'general' }); setShowForm(true); };
  const openEdit = (s: Service) => { setEdit(s); setForm({ name: s.name, description: s.description, price: String(s.price), category: s.category }); setShowForm(true); };

  const save = async () => {
    try {
      const body = { ...form, price: Number(form.price) };
      if (edit) { await api.put(`/services/${edit.id}`, body); toast('Service updated', 'success'); }
      else { await api.post('/services', body); toast('Service created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/services/${id}`); toast('Service deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Services</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api.download('/export/services/csv', 'services.csv')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> CSV</button>
          <button onClick={() => api.download('/export/services/pdf', 'services.pdf')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> PDF</button>
          <button onClick={openNew} style={btn}>+ New Service</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Service' : 'New Service'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={input} />
            <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={input} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={select}>
              <option value="general">General</option><option value="food">Food</option><option value="beverage">Beverage</option>
              <option value="laundry">Laundry</option><option value="spa">Spa</option><option value="transport">Transport</option>
            </select>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : services.length === 0 ? (
        <p style={{ color: colors.slate }}>No services yet. Click "+ New Service" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Description</th><th style={th}>Category</th><th style={th}>Price</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{s.name}</td>
                  <td style={td}>{s.description || '-'}</td>
                  <td style={td}>{s.category}</td>
                  <td style={td}>{formatCurrency(s.price)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(s)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: s.id, name: s.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete Service"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
