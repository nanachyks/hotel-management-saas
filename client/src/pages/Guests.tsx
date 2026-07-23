import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';
import { Download, MessageCircle } from 'lucide-react';

interface Guest { id: string; first_name: string; last_name: string; email: string; phone: string; whatsapp: string; id_card_number: string; address: string; }

export default function Guests() {
  const { toast } = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Guest | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', whatsapp: '', id_card_number: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Guest | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    api.get<Guest[]>(`/guests${q ? `?search=${q}` : ''}`)
      .then(setGuests)
      .catch(() => toast('Failed to load guests', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => { if (search) { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); } }, [search]);

  const openNew = () => { setEdit(null); setForm({ first_name: '', last_name: '', email: '', phone: '', whatsapp: '', id_card_number: '', address: '' }); setShowForm(true); };
  const openEdit = (g: Guest) => { setEdit(g); setForm({ first_name: g.first_name, last_name: g.last_name, email: g.email, phone: g.phone, whatsapp: g.whatsapp || '', id_card_number: g.id_card_number, address: g.address }); setShowForm(true); };

  const save = async () => {
    try {
      if (edit) { await api.put(`/guests/${edit.id}`, form); toast('Guest updated', 'success'); }
      else { await api.post('/guests', form); toast('Guest created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/guests/${id}`); toast('Guest deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Guests</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api.download('/export/guests/csv', 'guests.csv')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> CSV</button>
          <button onClick={() => api.download('/export/guests/pdf', 'guests.pdf')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> PDF</button>
          <input placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} style={input} />
          <button onClick={openNew} style={btn}>+ New Guest</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Guest' : 'New Guest'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <input placeholder="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} style={input} />
            <input placeholder="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={input} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={input} />
            <input placeholder="WhatsApp (e.g. 233501234567)" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} style={input} />
            <input placeholder="ID Card Number" value={form.id_card_number} onChange={e => setForm({ ...form, id_card_number: e.target.value })} style={input} />
            <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={input} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton /> : guests.length === 0 ? (
        <p style={{ color: colors.slate }}>No guests found.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Email</th><th style={th}>Phone</th><th style={th}>WhatsApp</th><th style={th}>ID Card</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{g.first_name} {g.last_name}</td>
                  <td style={td}>{g.email}</td>
                  <td style={td}>{g.phone}</td>
                  <td style={td}>
                    {g.whatsapp ? (
                      <a href={`https://wa.me/${g.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <MessageCircle size={14} /> {g.whatsapp}
                      </a>
                    ) : '-'}
                  </td>
                  <td style={td}>{g.id_card_number || '-'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(g)} style={btnSm}>Edit</button>
                      {g.whatsapp && <a href={`https://wa.me/${g.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, color: '#22c55e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={14} /> WhatsApp</a>}
                      <button onClick={() => setConfirmDelete(g)} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete Guest"
        message={`Are you sure you want to delete ${confirmDelete?.first_name} ${confirmDelete?.last_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
