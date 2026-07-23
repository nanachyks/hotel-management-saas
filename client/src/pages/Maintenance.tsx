import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, statusBadge } from '../styles';

interface Maintenance { id: string; room_id: string; room_number: string; title: string; description: string; priority: string; status: string; assigned_to: string; assigned_name: string; reported_by_name: string; notes: string; created_at: string; }
interface Room { id: string; room_number: string; }
interface Employee { id: string; first_name: string; last_name: string; }

const statuses = ['reported', 'in_progress', 'resolved', 'closed'];
const priorities = ['low', 'medium', 'high', 'urgent'];

const priorityColors: Record<string, string> = { urgent: colors.danger, high: colors.warning, medium: colors.primary, low: colors.slate };
const priorityBadge = (p: string) => ({ background: priorityColors[p] || colors.slate, color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' as const, boxShadow: `0 0 12px ${priorityColors[p] || colors.slate}40` });

const nextStatus: Record<string, string> = { reported: 'in_progress', in_progress: 'resolved', resolved: 'closed' };

export default function Maintenance() {
  const { toast } = useToast();
  const [items, setItems] = useState<Maintenance[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Maintenance | null>(null);
  const [form, setForm] = useState({ room_id: '', title: '', description: '', priority: 'medium', status: 'reported', assigned_to: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    const qs = params.toString();
    api.get<{ data: Maintenance[] }>(`/maintenance${qs ? `?${qs}` : ''}`)
      .then(r => setItems(r.data || r as any))
      .catch(() => toast('Failed to load maintenance requests', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus, filterPriority]);

  const loadRooms = () => { api.get<{ data: Room[] }>('/rooms').then(r => setRooms(r.data || r as any)).catch(() => {}); };
  const loadEmployees = () => { api.get<{ data: Employee[] }>('/employees').then(r => setEmployees(r.data || r as any)).catch(() => {}); };
  useEffect(() => { loadRooms(); loadEmployees(); }, []);

  const openNew = () => { setEdit(null); setForm({ room_id: '', title: '', description: '', priority: 'medium', status: 'reported', assigned_to: '', notes: '' }); setShowForm(true); };
  const openEdit = (e: Maintenance) => { setEdit(e); setForm({ room_id: e.room_id, title: e.title, description: e.description, priority: e.priority, status: e.status, assigned_to: e.assigned_to || '', notes: e.notes || '' }); setShowForm(true); };

  const save = async () => {
    try {
      if (edit) { await api.put(`/maintenance/${edit.id}`, form); toast('Maintenance request updated', 'success'); }
      else { await api.post('/maintenance', form); toast('Maintenance request created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/maintenance/${id}`); toast('Maintenance request deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const changeStatus = async (id: string, status: string) => {
    try { await api.put(`/maintenance/${id}`, { status }); toast(`Status changed to ${status}`, 'success'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Maintenance</h1>
        <button onClick={openNew} style={btn}>+ New Request</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...select, width: 160 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...select, width: 160 }}>
          <option value="">All Priorities</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Request' : 'New Request'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} style={select}>
              <option value="">Select Room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
            </select>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={input} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={input} />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={select}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={select}>
              {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={select}>
              <option value="">Assign To</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={5} /> : items.length === 0 ? (
        <p style={{ color: colors.slate }}>No maintenance requests found.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Room</th><th style={th}>Title</th><th style={th}>Priority</th><th style={th}>Status</th><th style={th}>Assigned To</th><th style={th}>Reported By</th><th style={th}>Created</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{item.room_number}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{item.title}</td>
                  <td style={td}><span style={priorityBadge(item.priority)}>{item.priority}</span></td>
                  <td style={td}><span style={statusBadge(item.status)}>{item.status.replace('_', ' ')}</span></td>
                  <td style={{ ...td, fontSize: 14, color: colors.slate }}>{item.assigned_name || '-'}</td>
                  <td style={{ ...td, fontSize: 14, color: colors.slate }}>{item.reported_by_name || '-'}</td>
                  <td style={{ ...td, fontSize: 14, color: colors.slate }}>{formatDate(item.created_at)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {nextStatus[item.status] && (
                        <button onClick={() => changeStatus(item.id, nextStatus[item.status])} style={{ ...btnSm, fontSize: 12, padding: '4px 10px' }}>
                          {nextStatus[item.status].replace('_', ' ')}
                        </button>
                      )}
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
        title="Delete Maintenance Request"
        message="Are you sure you want to delete this maintenance request? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
