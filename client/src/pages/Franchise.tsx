import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency } from '../styles';

interface FranchiseGroup {
  id: string; name: string; parent_hotel_id: string; settings: string; member_count: number;
}
interface FranchiseMember {
  id: string; group_id: string; hotel_id: string; role: string; hotel_name: string;
}
interface ConsolidatedReport {
  group: FranchiseGroup; members: number; occupancy: number; revenue: number; bookings: number;
}

export default function Franchise() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<FranchiseGroup[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<FranchiseGroup | null>(null);
  const [form, setForm] = useState({ name: '', settings: '{}' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [members, setMembers] = useState<FranchiseMember[]>([]);
  const [membersGroup, setMembersGroup] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ hotel_id: '', role: 'member' });

  const [report, setReport] = useState<ConsolidatedReport[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<FranchiseGroup[]>('/franchise/groups')
      .then(setGroups)
      .catch(() => toast('Failed to load franchise groups', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ name: '', settings: '{}' }); setShowForm(true); };
  const openEdit = (g: FranchiseGroup) => { setEdit(g); setForm({ name: g.name, settings: g.settings || '{}' }); setShowForm(true); };

  const save = async () => {
    try {
      if (edit) { await api.put(`/franchise/groups/${edit.id}`, form); toast('Group updated', 'success'); }
      else { await api.post('/franchise/groups', form); toast('Group created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/franchise/groups/${id}`); toast('Group deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const loadMembers = async (groupId: string) => {
    setMembersGroup(groupId);
    setMembersLoading(true);
    try {
      const data = await api.get<FranchiseMember[]>(`/franchise/groups/${groupId}/members`);
      setMembers(data);
    } catch (e: any) { toast(e.message, 'error'); }
    setMembersLoading(false);
  };

  const addMember = async () => {
    if (!membersGroup) return;
    try {
      await api.post(`/franchise/groups/${membersGroup}/members`, memberForm);
      toast('Member added', 'success');
      setShowMemberForm(false);
      loadMembers(membersGroup);
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const removeMember = async (memberId: string) => {
    try {
      await api.del(`/franchise/members/${memberId}`);
      toast('Member removed', 'success');
      if (membersGroup) { loadMembers(membersGroup); load(); }
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const loadReport = async () => {
    setShowReport(true);
    setReportLoading(true);
    try {
      const data = await api.get<ConsolidatedReport[]>('/franchise/consolidated');
      setReport(data);
    } catch (e: any) { toast(e.message, 'error'); }
    setReportLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Franchise Groups</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowReport(!showReport); if (!showReport) loadReport(); }} style={btnSm}>{showReport ? 'Hide Report' : 'Consolidated Report'}</button>
          <button onClick={openNew} style={btn}>+ New Group</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Group' : 'New Group'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <input placeholder="Group Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input placeholder="Settings (JSON)" value={form.settings} onChange={e => setForm({ ...form, settings: e.target.value })} style={input} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {showReport && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>Consolidated Report</h2>
          {reportLoading ? <LoadingSkeleton rows={3} /> : report.length === 0 ? (
            <p style={{ color: colors.slate }}>No consolidated data available. You must be an owner of a group.</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={th}>Group</th><th style={th}>Members</th><th style={th}>Occupancy</th><th style={th}>Revenue (30d)</th><th style={th}>Bookings (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map(r => (
                    <tr key={r.group.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.group.name}</td>
                      <td style={td}>{r.members}</td>
                      <td style={td}>{(r.occupancy * 100).toFixed(1)}%</td>
                      <td style={td}>{formatCurrency(r.revenue)}</td>
                      <td style={td}>{r.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : groups.length === 0 ? (
        <p style={{ color: colors.slate }}>No franchise groups yet. Click "+ New Group" to create one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Members</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontWeight: 600 }}>{g.name}</td>
                  <td style={td}>{g.member_count}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => loadMembers(g.id)} style={btnSm}>Members</button>
                      <button onClick={() => openEdit(g)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: g.id, name: g.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {membersGroup && (
        <div style={{ ...card, marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={sectionTitle}>Members</h2>
            <button onClick={() => { setShowMemberForm(true); setMemberForm({ hotel_id: '', role: 'member' }); }} style={btnSm}>+ Add Member</button>
          </div>
          {showMemberForm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 16, alignItems: 'end' }}>
              <input placeholder="Hotel ID" value={memberForm.hotel_id} onChange={e => setMemberForm({ ...memberForm, hotel_id: e.target.value })} style={input} />
              <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })} style={select}>
                <option value="member">Member</option><option value="owner">Owner</option><option value="affiliate">Affiliate</option>
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addMember} style={btnSm}>Add</button>
                <button onClick={() => setShowMemberForm(false)} style={{ ...btnSm, color: colors.slate }}>X</button>
              </div>
            </div>
          )}
          {membersLoading ? <LoadingSkeleton rows={2} /> : members.length === 0 ? (
            <p style={{ color: colors.slate }}>No members yet.</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={th}>Hotel</th><th style={th}>Role</th><th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={td}>{m.hotel_name}</td>
                      <td style={td}><span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 13 }}>{m.role}</span></td>
                      <td style={td}><button onClick={() => removeMember(m.id)} style={{ ...btnSm, color: colors.danger }}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Group"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? All members will be removed.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
