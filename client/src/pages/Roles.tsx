import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';

interface Role {
  id: string; hotel_id: string; name: string; permissions: string; created_at: string;
}

const ALL_PERMISSIONS = [
  'bookings:create', 'bookings:read', 'bookings:update', 'bookings:delete',
  'guests:create', 'guests:read', 'guests:update', 'guests:delete',
  'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete',
  'housekeeping:read', 'housekeeping:update',
  'inventory:read', 'inventory:update',
  'billing:read', 'billing:create', 'billing:update',
  'reports:read',
  'users:read', 'users:create', 'users:update',
  'settings:read', 'settings:update',
  'payroll:read', 'payroll:update',
  'integrations:read', 'integrations:update',
  'corporate:read', 'corporate:write',
  'franchise:read', 'franchise:write',
  'ai:read',
];

const permissionGroups: Record<string, string[]> = {
  Bookings: ['bookings:create', 'bookings:read', 'bookings:update', 'bookings:delete'],
  Guests: ['guests:create', 'guests:read', 'guests:update', 'guests:delete'],
  Rooms: ['rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete'],
  Housekeeping: ['housekeeping:read', 'housekeeping:update'],
  Inventory: ['inventory:read', 'inventory:update'],
  Billing: ['billing:read', 'billing:create', 'billing:update'],
  Reports: ['reports:read'],
  Users: ['users:read', 'users:create', 'users:update'],
  Settings: ['settings:read', 'settings:update'],
  Payroll: ['payroll:read', 'payroll:update'],
  Integrations: ['integrations:read', 'integrations:update'],
  Corporate: ['corporate:read', 'corporate:write'],
  Franchise: ['franchise:read', 'franchise:write'],
  AI: ['ai:read'],
};

export default function Roles() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '' });
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [assignForm, setAssignForm] = useState({ user_id: '', role_id: '' });

  const load = () => {
    setLoading(true);
    api.get<Role[]>('/roles')
      .then(setRoles)
      .catch(() => toast('Failed to load roles', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEdit(null);
    setForm({ name: '' });
    setSelectedPerms(new Set());
    setShowForm(true);
  };

  const openEdit = (r: Role) => {
    setEdit(r);
    setForm({ name: r.name });
    try {
      setSelectedPerms(new Set(JSON.parse(r.permissions)));
    } catch { setSelectedPerms(new Set()); }
    setShowForm(true);
  };

  const togglePerm = (perm: string) => {
    const next = new Set(selectedPerms);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setSelectedPerms(next);
  };

  const save = async () => {
    try {
      const body = { name: form.name, permissions: Array.from(selectedPerms) };
      if (edit) { await api.put(`/roles/${edit.id}`, body); toast('Role updated', 'success'); }
      else { await api.post('/roles', body); toast('Role created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/roles/${id}`); toast('Role deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const assignRole = async () => {
    try {
      await api.post('/roles/assign', assignForm);
      toast('Role assigned', 'success');
      setAssignForm({ user_id: '', role_id: '' });
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Custom Roles & Permissions</h1>
        <button onClick={openNew} style={btn}>+ New Role</button>
      </div>

      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={sectionTitle}>Assign Role to User</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <input placeholder="User ID" value={assignForm.user_id} onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })} style={input} />
          <select value={assignForm.role_id} onChange={e => setAssignForm({ ...assignForm, role_id: e.target.value })} style={input}>
            <option value="">Select role...</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={assignRole} style={btnSm}>Assign</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Role' : 'New Role'}</h2>
          <input placeholder="Role Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...input, marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {Object.entries(permissionGroups).map(([group, perms]) => (
              <div key={group} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.dark, marginBottom: 8 }}>{group}</div>
                {perms.map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: colors.slate, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedPerms.has(p)} onChange={() => togglePerm(p)} style={{ accentColor: colors.primary }} />
                    {p.split(':')[1]}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : roles.length === 0 ? (
        <p style={{ color: colors.slate }}>No custom roles yet. Click "+ New Role" to create one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Permissions</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => {
                let perms: string[] = [];
                try { perms = JSON.parse(r.permissions); } catch {}
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {perms.slice(0, 5).map(p => (
                          <span key={p} style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 11 }}>{p}</span>
                        ))}
                        {perms.length > 5 && <span style={{ fontSize: 11, color: colors.slate }}>+{perms.length - 5}</span>}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(r)} style={btnSm}>Edit</button>
                        <button onClick={() => setConfirmDelete({ id: r.id, name: r.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? Users assigned this role will lose its permissions.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
