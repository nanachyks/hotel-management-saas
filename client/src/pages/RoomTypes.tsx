import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency } from '../styles';
import { Download } from 'lucide-react';

interface RoomType { id: string; name: string; description: string; base_price: number; capacity: number; }

export default function RoomTypes() {
  const { toast } = useToast();
  const [types, setTypes] = useState<RoomType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<RoomType | null>(null);
  const [form, setForm] = useState({ name: '', description: '', base_price: '', capacity: '1' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.get<RoomType[]>('/room-types')
      .then(setTypes)
      .catch(() => toast('Failed to load room types', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ name: '', description: '', base_price: '', capacity: '1' }); setShowForm(true); };
  const openEdit = (t: RoomType) => { setEdit(t); setForm({ name: t.name, description: t.description, base_price: String(t.base_price), capacity: String(t.capacity) }); setShowForm(true); };

  const save = async () => {
    try {
      const body = { ...form, base_price: Number(form.base_price), capacity: Number(form.capacity) };
      if (edit) { await api.put(`/room-types/${edit.id}`, body); toast('Room type updated', 'success'); }
      else { await api.post('/room-types', body); toast('Room type created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/room-types/${id}`); toast('Room type deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Room Types</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api.download('/export/room-types/csv', 'room-types.csv')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> CSV</button>
          <button onClick={() => api.download('/export/room-types/pdf', 'room-types.pdf')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> PDF</button>
          <button onClick={openNew} style={btn}>+ New Type</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Room Type' : 'New Room Type'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={input} />
            <input type="number" placeholder="Base Price" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} style={input} />
            <input type="number" placeholder="Capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} style={input} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : types.length === 0 ? (
        <p style={{ color: colors.slate }}>No room types yet. Click "+ New Type" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Description</th><th style={th}>Base Price</th><th style={th}>Capacity</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontWeight: 600, color: '#fff' }}>{t.name}</td>
                  <td style={td}>{t.description || '-'}</td>
                  <td style={{ ...td, color: colors.primary, fontWeight: 600 }}>{formatCurrency(t.base_price)}</td>
                  <td style={td}>{t.capacity}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(t)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: t.id, name: t.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete Room Type"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? Rooms using this type may be affected.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
