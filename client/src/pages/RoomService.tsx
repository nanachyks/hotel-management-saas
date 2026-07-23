import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';

interface RoomServiceItem { id: string; room_id: string; room_number: string; guest_name: string; request_type: string; description: string; status: string; assigned_to: string; assigned_name: string; notes: string; created_at: string; }
interface Room { id: string; room_number: string; }
interface Employee { id: string; first_name: string; last_name: string; }

const statuses = ['pending', 'in_progress', 'delivered', 'completed', 'cancelled'];
const requestTypes = ['food', 'laundry', 'towels', 'wake_up', 'other'];

const requestColors: Record<string, string> = { food: '#f59e0b', laundry: '#3b82f6', towels: '#22c55e', wake_up: '#a855f7', other: '#64748b' };
const statusColors: Record<string, string> = { pending: '#f59e0b', in_progress: '#3b82f6', delivered: '#06b6d4', completed: '#22c55e', cancelled: '#ef4444' };

const badge = (color: string, label: string) => (
  <span style={{ background: color, color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', boxShadow: `0 0 12px ${color}40` }}>{label.replace('_', ' ')}</span>
);

export default function RoomService() {
  const { toast } = useToast();
  const [items, setItems] = useState<RoomServiceItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<RoomServiceItem | null>(null);
  const [form, setForm] = useState({ room_id: '', guest_name: '', request_type: 'other', description: '', assigned_to: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterType) params.set('request_type', filterType);
    const qs = params.toString();
    api.get<{ data: RoomServiceItem[] }>(`/room-service${qs ? `?${qs}` : ''}`)
      .then(r => setItems(r.data || r as any))
      .catch(() => toast('Failed to load room service requests', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus, filterType]);

  useEffect(() => {
    api.get<{ data: Room[] }>('/rooms').then(r => setRooms(r.data || r as any)).catch(() => {});
    api.get<{ data: Employee[] }>('/employees').then(r => setEmployees(r.data || r as any)).catch(() => {});
  }, []);

  const openNew = () => { setEdit(null); setForm({ room_id: '', guest_name: '', request_type: 'other', description: '', assigned_to: '', notes: '' }); setShowForm(true); };
  const openEdit = (e: RoomServiceItem) => { setEdit(e); setForm({ room_id: e.room_id, guest_name: e.guest_name, request_type: e.request_type, description: e.description, assigned_to: e.assigned_to || '', notes: e.notes || '' }); setShowForm(true); };

  const save = async () => {
    try {
      if (edit) { await api.put(`/room-service/${edit.id}`, form); toast('Request updated', 'success'); }
      else { await api.post('/room-service', form); toast('Request created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/room-service/${id}`); toast('Request deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const changeStatus = async (id: string, status: string) => {
    try { await api.put(`/room-service/${id}`, { status }); toast(`Status updated to ${status.replace('_', ' ')}`, 'success'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Room Service</h1>
        <button onClick={openNew} style={btn}>+ New Request</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...select, width: 160 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...select, width: 160 }}>
          <option value="">All Types</option>
          {requestTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Request' : 'New Request'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} style={select}>
              <option value="">Select Room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
            </select>
            <input placeholder="Guest Name" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} style={input} />
            <select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })} style={select}>
              {requestTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={select}>
              <option value="">Assign to...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
            </select>
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...input, gridColumn: 'span 2', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...input, gridColumn: 'span 2', minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={5} /> : items.length === 0 ? (
        <p style={{ color: colors.slate }}>No room service requests yet.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Room</th><th style={th}>Guest Name</th><th style={th}>Type</th><th style={th}>Description</th><th style={th}>Status</th><th style={th}>Assigned To</th><th style={th}>Created</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{item.room_number}</td>
                  <td style={{ ...td, fontWeight: 600, color: colors.dark }}>{item.guest_name}</td>
                  <td style={td}>{badge(requestColors[item.request_type] || '#64748b', item.request_type)}</td>
                  <td style={{ ...td, fontSize: 14 }}>{item.description}</td>
                  <td style={td}>{badge(statusColors[item.status] || '#475569', item.status)}</td>
                  <td style={{ ...td, fontSize: 14, color: colors.slate }}>{item.assigned_name || '-'}</td>
                  <td style={{ ...td, fontSize: 14, color: colors.slate }}>{item.created_at?.split('T')[0]}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.status === 'pending' && <button onClick={() => changeStatus(item.id, 'in_progress')} style={{ ...btnSm, fontSize: 12 }}>In Progress</button>}
                      {item.status === 'in_progress' && <button onClick={() => changeStatus(item.id, 'delivered')} style={{ ...btnSm, fontSize: 12, color: '#06b6d4' }}>Delivered</button>}
                      {item.status === 'delivered' && <button onClick={() => changeStatus(item.id, 'completed')} style={{ ...btnSm, fontSize: 12, color: colors.success }}>Complete</button>}
                      <button onClick={() => openEdit(item)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete(item.id)} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete Request"
        message="Are you sure you want to delete this room service request? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
