import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Pagination from '../components/Pagination';
import { useCurrency } from '../context/CurrencyContext';
import { btn, btnSm, input, select, card, pageTitle, tableHeader as th, tableCell as td, colors, glass } from '../styles';
import { Download } from 'lucide-react';

interface Booking { id: string; guest_name: string; guest_id: string; room_id: string; room_number: string; check_in_date: string; check_out_date: string; status: string; source: string; total_amount: number; room_type_name: string; }
interface Guest { id: string; first_name: string; last_name: string; email: string; phone: string; }

const sourceOptions = ['walk_in', 'online', 'phone', 'corporate', 'group'];
const statusOptions = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

export default function Bookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { f } = useCurrency();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    guest_id: '', room_id: searchParams.get('room') || '',
    check_in_date: searchParams.get('checkIn') || '',
    check_out_date: searchParams.get('checkOut') || '',
    source: 'walk_in',
  });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    params.set('page', String(page));
    params.set('limit', String(limit));
    const url = '/bookings?' + params.toString();
    Promise.all([api.get<{ data: Booking[]; total: number }>(url), api.get<Guest[]>('/guests'), api.get<any[]>('/rooms')])
      .then(([r, g, roomData]) => { setBookings(r.data); setTotal(r.total); setGuests(g); setRooms(roomData); })
      .catch(() => toast('Failed to load bookings', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus, page, limit]);
  useEffect(() => { if (searchParams.get('room')) setShowForm(true); }, []);

  const create = async () => {
    try {
      await api.post('/bookings', form);
      toast('Booking created', 'success');
      setShowForm(false); setForm({ guest_id: '', room_id: '', check_in_date: '', check_out_date: '', source: 'walk_in' }); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/bookings/${id}`, { status });
      const msgs: Record<string, string> = { checked_in: 'Guest checked in', checked_out: 'Guest checked out', cancelled: 'Booking cancelled', no_show: 'Marked as no show', confirmed: 'Booking confirmed' };
      toast(msgs[status] || 'Status updated', 'success');
      setConfirmAction(null);
      load();
    } catch (e: any) { toast(e.message, 'error'); setConfirmAction(null); }
  };

  const sourceLabels: Record<string, string> = { walk_in: 'Walk-in', online: 'Online', phone: 'Phone', corporate: 'Corporate', group: 'Group' };
  const roomOptions = rooms.filter(r => r.status !== 'maintenance');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Bookings</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api.download('/export/bookings/csv', 'bookings.csv')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> CSV</button>
          <button onClick={() => api.download('/export/bookings/pdf', 'bookings.pdf')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> PDF</button>
          <button onClick={() => { setShowForm(true); setForm({ guest_id: '', room_id: '', check_in_date: '', check_out_date: '', source: 'walk_in' }); }} style={btn}>+ New Booking</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...select, width: 180 }}>
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: colors.dark }}>New Booking</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <select value={form.guest_id} onChange={e => setForm({ ...form, guest_id: e.target.value })} style={select}>
              <option value="">Select Guest</option>
              {guests.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
            </select>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} style={select}>
              <option value="">Select Room</option>
              {roomOptions.map(r => <option key={r.id} value={r.id}>#{r.room_number} - {r.room_type_name} ({f(r.base_price)})</option>)}
            </select>
            <input type="date" value={form.check_in_date} onChange={e => setForm({ ...form, check_in_date: e.target.value })} style={input} />
            <input type="date" value={form.check_out_date} onChange={e => setForm({ ...form, check_out_date: e.target.value })} style={input} />
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={select}>
              {sourceOptions.map(s => <option key={s} value={s}>{sourceLabels[s]}</option>)}
            </select>
            <div></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={create} style={btn}>Create</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={8} /> : bookings.length === 0 ? (
        <p style={{ color: colors.slate }}>No bookings yet.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Guest</th><th style={th}>Room</th><th style={th}>Type</th><th style={th}>Check-in</th><th style={th}>Check-out</th><th style={th}>Source</th><th style={th}>Status</th><th style={th}>Amount</th><th style={th}>Actions</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{b.guest_name}</td>
                  <td style={td}>{b.room_number}</td>
                  <td style={td}>{b.room_type_name}</td>
                  <td style={td}>{b.check_in_date}</td>
                  <td style={td}>{b.check_out_date}</td>
                  <td style={td}><span style={{ fontSize: 13, color: colors.slate }}>{sourceLabels[b.source] || b.source}</span></td>
                  <td style={td}><StatusBadge status={b.status} /></td>
                  <td style={td}>{f(b.total_amount || 0)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {b.status === 'pending' && <button onClick={() => updateStatus(b.id, 'confirmed')} style={{ ...btnSm, color: colors.primary }}>Confirm</button>}
                      {b.status === 'confirmed' && <button onClick={() => updateStatus(b.id, 'checked_in')} style={{ ...btnSm, color: colors.success }}>Check-in</button>}
                      {b.status === 'checked_in' && <button onClick={() => updateStatus(b.id, 'checked_out')} style={{ ...btnSm, color: colors.warning }}>Check-out</button>}
                      {(b.status === 'pending' || b.status === 'confirmed') && <button onClick={() => setConfirmAction({ id: b.id, status: 'cancelled' })} style={{ ...btnSm, color: colors.danger }}>Cancel</button>}
                      {b.status === 'confirmed' && <button onClick={() => setConfirmAction({ id: b.id, status: 'no_show' })} style={{ ...btnSm, color: colors.warning }}>No Show</button>}
                    </div>
                  </td>
                  <td style={td}>
                    <button onClick={() => navigate(`/bookings/${b.id}`)} style={{ ...btnSm, color: colors.primary }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }} />
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.status === 'cancelled' ? 'Cancel Booking' : 'Mark as No Show'}
        message={confirmAction?.status === 'cancelled' ? 'Are you sure you want to cancel this booking?' : 'Are you sure you want to mark this booking as no show?'}
        confirmLabel={confirmAction?.status === 'cancelled' ? 'Cancel Booking' : 'No Show'}
        danger={confirmAction?.status === 'cancelled'}
        onConfirm={() => updateStatus(confirmAction!.id, confirmAction!.status)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
