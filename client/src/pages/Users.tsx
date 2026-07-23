import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';

interface User { id: string; username: string; email: string; name: string; role: string; created_at: string; }

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', role: 'receptionist' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.get<User[]>('/users')
      .then(setUsers)
      .catch(() => toast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ username: '', password: '', name: '', email: '', role: 'receptionist' }); setShowForm(true); };
  const openEdit = (u: User) => { setEdit(u); setForm({ username: u.username, password: '', name: u.name, email: u.email, role: u.role }); setShowForm(true); };

  const save = async () => {
    try {
      const body = edit ? { username: form.username, name: form.name, email: form.email, role: form.role } : form;
      if (form.password) (body as any).password = form.password;
      if (edit) { await api.put(`/users/${edit.id}`, body); toast('User updated', 'success'); }
      else { await api.post('/users', body); toast('User created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/users/${id}`); toast('User deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Users</h1>
        <button onClick={openNew} style={btn}>+ New User</button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit User' : 'New User'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={input} />
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} />
            <input type="password" placeholder={edit ? 'New password (leave blank)' : 'Password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={input} />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={select}>
              <option value="admin">Admin</option><option value="owner">Owner</option><option value="manager">Manager</option><option value="receptionist">Receptionist</option><option value="housekeeping">Housekeeping</option><option value="accountant">Accountant</option>
            </select>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={5} /> : users.length === 0 ? (
        <p style={{ color: colors.slate }}>No users found. Click "+ New User" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Username</th><th style={th}>Name</th><th style={th}>Email</th><th style={th}>Role</th><th style={th}>Created</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}>{u.username}</td>
                  <td style={td}>{u.name}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{u.created_at?.split('T')[0]}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: u.id, name: u.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete User"
        message={`Are you sure you want to delete user "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
