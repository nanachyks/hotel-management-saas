import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';
import { RefreshCw, Radio } from 'lucide-react';

interface ChannelConnection {
  id: string; hotel_id: string; channel: string; name: string;
  api_key: string; endpoint_url: string; enabled: number;
  last_sync_at: string | null; created_at: string;
}

interface AvailabilityInfo {
  total: number; available: number; rooms: any[];
}

export default function Channels() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<ChannelConnection | null>(null);
  const [form, setForm] = useState({ channel: 'airbnb', name: '', api_key: '', endpoint_url: '' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityInfo | null>(null);

  const load = () => {
    setLoading(true);
    api.get<ChannelConnection[]>('/channels')
      .then(setChannels)
      .catch(() => toast('Failed to load channels', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const loadAvailability = async () => {
    try {
      const data = await api.get<AvailabilityInfo>('/channels/availability');
      setAvailability(data);
    } catch (e: any) { toast(e.message, 'error'); }
  };
  useEffect(() => { loadAvailability(); }, []);

  const openNew = () => {
    setEdit(null);
    setForm({ channel: 'airbnb', name: '', api_key: '', endpoint_url: '' });
    setShowForm(true);
  };
  const openEdit = (c: ChannelConnection) => {
    setEdit(c);
    setForm({ channel: c.channel, name: c.name, api_key: c.api_key || '', endpoint_url: c.endpoint_url || '' });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (edit) { await api.put(`/channels/${edit.id}`, form); toast('Channel updated', 'success'); }
      else { await api.post('/channels', form); toast('Channel created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/channels/${id}`); toast('Channel removed', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const sync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await api.post<{ message: string; channel: string; roomsSynced: number }>(`/channels/${id}/sync`, {});
      toast(`${res.message} (${res.roomsSynced} rooms)`, 'success');
      load(); loadAvailability();
    } catch (e: any) { toast(e.message, 'error'); }
    setSyncing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Channel Connections</h1>
        <button onClick={openNew} style={btn}>+ New Connection</button>
      </div>

      {availability && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ ...card, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.dark }}>{availability.total}</div>
            <div style={{ fontSize: 13, color: colors.slate }}>Total Rooms</div>
          </div>
          <div style={{ ...card, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>{availability.available}</div>
            <div style={{ fontSize: 13, color: colors.slate }}>Available</div>
          </div>
          <div style={{ ...card, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.warning }}>{availability.total - availability.available}</div>
            <div style={{ fontSize: 13, color: colors.slate }}>Booked / Occupied</div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Connection' : 'New Connection'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={select}>
              <option value="airbnb">Airbnb</option><option value="booking">Booking.com</option>
              <option value="expedia">Expedia</option><option value="direct">Direct</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Connection Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input placeholder="API Key" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} style={input} />
            <input placeholder="Endpoint URL" value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })} style={input} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : channels.length === 0 ? (
        <p style={{ color: colors.slate }}>No channel connections yet. Click "+ New Connection" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Channel</th><th style={th}>Name</th><th style={th}>Status</th><th style={th}>Last Sync</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Radio size={16} style={{ color: colors.primary }} />
                      <span style={{ fontWeight: 600 }}>{c.channel}</span>
                    </div>
                  </td>
                  <td style={td}>{c.name}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: c.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: c.enabled ? colors.success : colors.danger, fontSize: 13 }}>{c.enabled ? 'Enabled' : 'Disabled'}</span>
                  </td>
                  <td style={{ ...td, fontSize: 13, color: colors.slate }}>{c.last_sync_at || 'Never'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => sync(c.id)} style={btnSm} disabled={syncing === c.id}>
                        <RefreshCw size={14} style={{ animation: syncing === c.id ? 'spin 1s linear infinite' : undefined }} /> {syncing === c.id ? '...' : 'Sync'}
                      </button>
                      <button onClick={() => openEdit(c)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: c.id, name: c.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Remove Connection"
        message={`Are you sure you want to remove "${confirmDelete?.name}"?`}
        confirmLabel="Remove"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
