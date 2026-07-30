import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency } from '../styles';
import { Download, Search, LayoutGrid, List, QrCode } from 'lucide-react';

interface RoomType { id: string; name: string; base_price: number; capacity: number; }
interface Room { id: string; room_number: string; room_type_id: string; floor: number; status: string; room_type_name: string; base_price: number; price?: number; capacity?: number; amenities?: string; notes?: string; photo?: string; }

export default function Rooms() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<Record<number, Room[]>>({});
  const [types, setTypes] = useState<RoomType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Room | null>(null);
  const [form, setForm] = useState({ room_number: '', room_type_id: '', floor: '1', status: 'available', amenities: '', notes: '', price: '', capacity: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'floor'>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null);
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Room[]>('/rooms' + (search ? `?search=${encodeURIComponent(search)}` : '') + (filterStatus ? `${search ? '&' : '?'}status=${filterStatus}` : '') + (filterFloor ? `${search || filterStatus ? '&' : '?'}floor=${filterFloor}` : '')),
      api.get<RoomType[]>('/room-types'),
    ])
      .then(([r, t]) => { setRooms(r); setTypes(t); })
      .catch(() => toast('Failed to load rooms', 'error'))
      .finally(() => setLoading(false));
  };

  const loadFloors = () => {
    setLoading(true);
    api.get<Record<number, Room[]>>('/rooms/floors')
      .then(f => setFloors(f))
      .catch(() => toast('Failed to load floor view', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (view === 'floor') loadFloors();
    else load();
  }, [view, search, filterStatus, filterFloor]);

  const openNew = () => {
    setEdit(null);
    setForm({ room_number: '', room_type_id: types[0]?.id || '', floor: '1', status: 'available', amenities: '', notes: '', price: '', capacity: '' });
    setShowForm(true);
  };

  const openEdit = (r: Room) => {
    setEdit(r);
    setForm({
      room_number: r.room_number, room_type_id: r.room_type_id, floor: String(r.floor),
      status: r.status, amenities: r.amenities || '', notes: r.notes || '',
      price: r.price?.toString() || '', capacity: r.capacity?.toString() || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    try {
      const body = {
        ...form,
        floor: parseInt(form.floor) || 1,
        price: form.price ? parseFloat(form.price) : null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
      };
      if (edit) { await api.put(`/rooms/${edit.id}`, body); toast('Room updated', 'success'); }
      else { await api.post('/rooms', body); toast('Room created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/rooms/${id}`); toast('Room deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.put(`/rooms/${id}`, { status }); if (view === 'floor') loadFloors(); else load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const handlePhotoUpload = async (roomId: string, file: File) => {
    setUploading(roomId);
    try {
      await api.upload(`/rooms/${roomId}/photo`, file);
      toast('Photo uploaded', 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setUploading(null); }
  };

  const handleDeletePhoto = async (roomId: string) => {
    if (!confirmPhotoDelete) return;
    try { await api.del(`/rooms/${roomId}/photo`); toast('Photo removed', 'success'); setConfirmPhotoDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmPhotoDelete(null); }
  };

  const statusOptions = ['available', 'reserved', 'occupied', 'cleaning', 'maintenance', 'out_of_service'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={pageTitle}>Rooms</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api.download('/export/rooms/csv', 'rooms.csv')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> CSV</button>
          <button onClick={openNew} style={btn}>+ New Room</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.slate }} />
          <input
            placeholder="Search rooms, amenities, notes..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...input, paddingLeft: 36, width: '100%' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={select}>
          <option value="">All Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={select}>
          <option value="">All Floors</option>
          {[1, 2, 3, 4, 5].map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setView('list')} style={{
            padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: view === 'list' ? 'rgba(59,130,246,0.2)' : 'transparent',
            color: view === 'list' ? '#fff' : colors.slate,
          }}><List size={16} /></button>
          <button onClick={() => setView('floor')} style={{
            padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: view === 'floor' ? 'rgba(59,130,246,0.2)' : 'transparent',
            color: view === 'floor' ? '#fff' : colors.slate,
          }}><LayoutGrid size={16} /></button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Room' : 'New Room'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <input placeholder="Room Number" value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} style={input} />
            <select value={form.room_type_id} onChange={e => setForm({ ...form, room_type_id: e.target.value })} style={select}>
              {types.map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.base_price)})</option>)}
            </select>
            <input type="number" placeholder="Floor" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} style={input} />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={select}>
              {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <input placeholder="Amenities (comma separated)" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
            <input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
            <input type="number" step="0.01" placeholder="Price override (optional)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={input} />
            <input type="number" placeholder="Capacity override (optional)" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} style={input} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={8} count={1} /> : view === 'floor' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(floors).sort(([a], [b]) => Number(b) - Number(a)).map(([floorNum, floorRooms]) => (
            <div key={floorNum}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: colors.slate }}>Floor</span> {floorNum}
                <span style={{ fontSize: 13, color: colors.slate, fontWeight: 400 }}>({floorRooms.length} rooms)</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {floorRooms.map(room => (
                  <div key={room.id} style={{
                    ...card, padding: 16, cursor: 'pointer',
                    borderLeft: `3px solid ${({
                      available: '#22c55e', reserved: '#a855f7', occupied: '#f59e0b',
                      cleaning: '#06b6d4', maintenance: '#f97316', out_of_service: '#ef4444',
                    }[room.status] || '#475569')}}`,
                  }} onClick={() => openEdit(room)}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{room.room_number}</div>
                    <div style={{ fontSize: 13, color: colors.slate }}>{room.room_type_name}</div>
                    <div style={{ marginTop: 8 }}><StatusBadge status={room.status} /></div>
                    <div style={{ marginTop: 6, fontSize: 13, color: colors.primary, fontWeight: 600 }}>
                      {room.price ? formatCurrency(room.price) : formatCurrency(room.base_price)}
                    </div>
                    {room.amenities && <div style={{ fontSize: 11, color: colors.slate, marginTop: 4 }}>{room.amenities}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <p style={{ color: colors.slate }}>No rooms match your filters. Click "+ New Room" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Photo</th><th style={th}>Room #</th><th style={th}>Type</th><th style={th}>Floor</th><th style={th}>Price</th><th style={th}>Capacity</th><th style={th}>Amenities</th><th style={th}>Status</th><th style={th}>QR</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>
                    {(r.photo || uploading === r.id) ? (
                      <div style={{ position: 'relative', width: 60, height: 40 }}>
                        {uploading === r.id ? (
                          <div style={{ width: 60, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: colors.slate }}>Uploading...</div>
                        ) : (
                          <>
                            <img src={r.photo} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                            <button onClick={() => setConfirmPhotoDelete(r.id)} style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', border: 'none', background: colors.danger, color: '#fff', fontSize: 10, lineHeight: '16px', textAlign: 'center', cursor: 'pointer', padding: 0 }}>&times;</button>
                          </>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => fileRefs.current[r.id]?.click()} style={{ ...btnSm, fontSize: 11, padding: '2px 8px' }}>+ Photo</button>
                    )}
                    <input type="file" accept="image/*" ref={el => fileRefs.current[r.id] = el} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(r.id, f); }} />
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: '#fff' }}>{r.room_number}</td>
                  <td style={td}>{r.room_type_name}</td>
                  <td style={td}>{r.floor}</td>
                  <td style={{ ...td, color: colors.primary, fontWeight: 600 }}>{r.price ? formatCurrency(r.price) : formatCurrency(r.base_price)}</td>
                  <td style={td}>{r.capacity || '-'}</td>
                  <td style={{ ...td, fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.amenities || '-'}</td>
                  <td style={td}><StatusBadge status={r.status} /></td>
                  <td style={td}>
                    <a href={`https://wa.me/?text=Room%20${r.room_number}%20-%20${window.location.origin}/room-service?room=${r.room_number}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, textDecoration: 'none' }} title="QR code for room service">
                      <QrCode size={16} />
                    </a>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(r)} style={btnSm}>Edit</button>
                      <select value="" onChange={e => { if (e.target.value) updateStatus(r.id, e.target.value); e.target.value = ''; }} style={{ ...btnSm, fontSize: 12, cursor: 'pointer' }}>
                        <option value="">Status</option>
                        {statusOptions.filter(s => s !== r.status).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                      <button onClick={() => setConfirmDelete(r)} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete Room"
        message={`Are you sure you want to delete room ${confirmDelete?.room_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmModal
        open={!!confirmPhotoDelete}
        title="Remove Photo"
        message="Are you sure you want to remove the photo for this room?"
        confirmLabel="Remove"
        danger
        onConfirm={() => handleDeletePhoto(confirmPhotoDelete!)}
        onCancel={() => setConfirmPhotoDelete(null)}
      />
    </div>
  );
}
