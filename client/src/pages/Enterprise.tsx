import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';

interface EnterpriseHotel {
  id: string; name: string; slug: string; address: string; phone: string;
  email: string; currency: string; timezone: string; logo_url: string;
  status: string; membership_role: string;
}

interface TeamMember {
  id: string; username: string; email: string; role: string; membership_role: string;
}

export default function Enterprise() {
  const { toast } = useToast();
  const [hotels, setHotels] = useState<EnterpriseHotel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<EnterpriseHotel | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', currency: 'GHS', timezone: 'Africa/Accra' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamForm, setTeamForm] = useState({ email: '', role: 'staff' });

  const load = () => {
    setLoading(true);
    api.get<EnterpriseHotel[]>('/enterprise/hotels')
      .then(setHotels)
      .catch(() => toast('Failed to load properties', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEdit(null);
    setForm({ name: '', address: '', phone: '', email: '', currency: 'GHS', timezone: 'Africa/Accra' });
    setShowForm(true);
  };
  const openEdit = (h: EnterpriseHotel) => {
    setEdit(h);
    setForm({ name: h.name, address: h.address || '', phone: h.phone || '', email: h.email || '', currency: h.currency, timezone: h.timezone });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (edit) { await api.put(`/enterprise/hotels/${edit.id}`, form); toast('Property updated', 'success'); }
      else { await api.post('/enterprise/hotels', form); toast('Property created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const loadTeam = async (hotelId: string) => {
    setSelectedHotel(hotelId);
    setTeamLoading(true);
    try {
      const data = await api.get<TeamMember[]>('/enterprise/team');
      setTeam(data);
    } catch (e: any) { toast(e.message, 'error'); }
    setTeamLoading(false);
  };

  const addTeamMember = async () => {
    try {
      await api.post('/enterprise/team', teamForm);
      toast('Team member added', 'success');
      setShowTeamForm(false);
      loadTeam(selectedHotel!);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const removeTeamMember = async (userId: string) => {
    try {
      await api.del(`/enterprise/team/${userId}`);
      toast('Team member removed', 'success');
      loadTeam(selectedHotel!);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Multi-Property Management</h1>
        <button onClick={openNew} style={btn}>+ New Property</button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Property' : 'New Property'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <input placeholder="Property Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={input} />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={input} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} />
            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={select}>
              <option value="GHS">GHS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </select>
            <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} style={select}>
              <option value="Africa/Accra">Africa/Accra</option><option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option><option value="Asia/Dubai">Asia/Dubai</option>
            </select>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : hotels.length === 0 ? (
        <p style={{ color: colors.slate }}>No properties yet. Click "+ New Property" to create one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Currency</th><th style={th}>Timezone</th><th style={th}>Role</th><th style={th}>Status</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map(h => (
                <tr key={h.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontWeight: 600 }}>{h.name}</td>
                  <td style={td}>{h.currency}</td>
                  <td style={td}>{h.timezone}</td>
                  <td style={td}><span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 13 }}>{h.membership_role}</span></td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: h.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: h.status === 'active' ? colors.success : colors.danger, fontSize: 13 }}>{h.status}</span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => loadTeam(h.id)} style={btnSm}>Team</button>
                      <button onClick={() => openEdit(h)} style={btnSm}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedHotel && (
        <div style={{ ...card, marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={sectionTitle}>Team Members</h2>
            <button onClick={() => { setShowTeamForm(true); setTeamForm({ email: '', role: 'staff' }); }} style={btnSm}>+ Add Member</button>
          </div>
          {showTeamForm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 16, alignItems: 'end' }}>
              <input type="email" placeholder="User Email" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} style={input} />
              <select value={teamForm.role} onChange={e => setTeamForm({ ...teamForm, role: e.target.value })} style={select}>
                <option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option>
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addTeamMember} style={btnSm}>Add</button>
                <button onClick={() => setShowTeamForm(false)} style={{ ...btnSm, color: colors.slate }}>X</button>
              </div>
            </div>
          )}
          {teamLoading ? <LoadingSkeleton rows={2} /> : team.length === 0 ? (
            <p style={{ color: colors.slate }}>No team members yet.</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={th}>Username</th><th style={th}>Email</th><th style={th}>Role</th><th style={th}>Membership</th><th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={td}>{m.username}</td>
                      <td style={td}>{m.email}</td>
                      <td style={td}>{m.role}</td>
                      <td style={td}><span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 13 }}>{m.membership_role}</span></td>
                      <td style={td}><button onClick={() => removeTeamMember(m.id)} style={{ ...btnSm, color: colors.danger }}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
