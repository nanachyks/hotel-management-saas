import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, statusBadge } from '../styles';

interface HousekeepingTask {
  id: string; room_id: string; room_number: string; priority: string;
  status: string; scheduled_date: string; notes: string; assigned_to: string; assigned_name: string;
}

interface Room { id: string; room_number: string; }
interface Employee { id: string; first_name: string; last_name: string; }

const statuses = ['pending', 'in_progress', 'completed', 'inspected'];
const priorities = ['low', 'medium', 'high'];

export default function Housekeeping() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<HousekeepingTask | null>(null);
  const [form, setForm] = useState({ room_id: '', assigned_to: '', priority: 'medium', scheduled_date: new Date().toISOString().split('T')[0], notes: '' });
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
    api.get<{ data: HousekeepingTask[] }>(`/housekeeping${qs ? `?${qs}` : ''}`)
      .then(r => setTasks(r.data || r as any))
      .catch(() => toast('Failed to load tasks', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus, filterPriority]);

  const loadRooms = () => {
    api.get<{ data: Room[] }>('/rooms')
      .then(r => setRooms(r.data || r as any))
      .catch(() => {});
  };

  const loadEmployees = () => {
    api.get<{ data: Employee[] }>('/employees')
      .then(r => setEmployees(r.data || r as any))
      .catch(() => {});
  };
  useEffect(() => { loadRooms(); loadEmployees(); }, []);

  const openNew = () => {
    setEdit(null);
    setForm({ room_id: '', assigned_to: '', priority: 'medium', scheduled_date: new Date().toISOString().split('T')[0], notes: '' });
    setShowForm(true);
  };

  const openEdit = (t: HousekeepingTask) => {
    setEdit(t);
    setForm({ room_id: t.room_id, assigned_to: t.assigned_to, priority: t.priority, scheduled_date: t.scheduled_date, notes: t.notes || '' });
    setShowForm(true);
  };

  const save = async () => {
    try {
      const body = { ...form };
      if (edit) { await api.put(`/housekeeping/${edit.id}`, body); toast('Task updated', 'success'); }
      else { await api.post('/housekeeping', body); toast('Task created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/housekeeping/${id}`); toast('Task deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const changeStatus = async (id: string, status: string) => {
    try { await api.put(`/housekeeping/${id}`, { status }); toast('Status updated', 'success'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const nextStatus = (status: string): string | null => {
    const map: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'inspected' };
    return map[status] || null;
  };

  const nextLabel = (status: string): string | null => {
    const map: Record<string, string> = { pending: 'In Progress', in_progress: 'Complete', completed: 'Inspected' };
    return map[status] || null;
  };

  const priorityBadge = (priority: string): React.CSSProperties => {
    const map: Record<string, string> = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
    return {
      background: map[priority] || '#475569', color: '#fff', padding: '4px 12px',
      borderRadius: 999, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' as const,
      boxShadow: `0 0 12px ${map[priority] || '#475569'}40`,
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Housekeeping</h1>
        <button onClick={openNew} style={btn}>+ New Task</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
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
          <h2 style={sectionTitle}>{edit ? 'Edit Task' : 'New Task'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} style={select}>
              <option value="">Select Room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={select}>
              <option value="">Assign Staff</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={select}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} style={input} />
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={5} /> : tasks.length === 0 ? (
        <p style={{ color: colors.slate }}>No housekeeping tasks found.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Room</th><th style={th}>Priority</th><th style={th}>Status</th><th style={th}>Assigned To</th><th style={th}>Scheduled</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontWeight: 600 }}>Room {t.room_number}</td>
                  <td style={td}><span style={priorityBadge(t.priority)}>{t.priority}</span></td>
                  <td style={td}><span style={statusBadge(t.status)}>{t.status.replace('_', ' ')}</span></td>
                  <td style={{ ...td, color: colors.slate }}>{t.assigned_name || '-'}</td>
                  <td style={td}>{t.scheduled_date}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {nextStatus(t.status) && (
                        <button onClick={() => changeStatus(t.id, nextStatus(t.status)!)} style={{ ...btnSm, color: colors.primary, fontSize: 12 }}>
                          Mark {nextLabel(t.status)}
                        </button>
                      )}
                      <button onClick={() => openEdit(t)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete(t.id)} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete Task"
        message="Are you sure you want to delete this housekeeping task? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
