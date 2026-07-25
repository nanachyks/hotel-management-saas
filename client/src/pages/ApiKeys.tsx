import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors } from '../styles';
import { Copy, RotateCcw } from 'lucide-react';

interface ApiKey {
  id: string; name: string; key: string; permissions: string;
  ip_whitelist: string; rate_limit: number; enabled: number;
  last_used_at: string | null; created_at: string;
}

export default function ApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<ApiKey | null>(null);
  const [form, setForm] = useState({ name: '', permissions: '["read"]', ip_whitelist: '[]', rate_limit: '100' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<ApiKey[]>('/api-keys')
      .then(setKeys)
      .catch(() => toast('Failed to load API keys', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEdit(null);
    setForm({ name: '', permissions: '["read"]', ip_whitelist: '[]', rate_limit: '100' });
    setNewSecret(null);
    setShowForm(true);
  };
  const openEdit = (k: ApiKey) => {
    setEdit(k);
    setForm({
      name: k.name, permissions: k.permissions, ip_whitelist: k.ip_whitelist,
      rate_limit: String(k.rate_limit),
    });
    setNewSecret(null);
    setShowForm(true);
  };

  const save = async () => {
    try {
      let perms: string[];
      try { perms = JSON.parse(form.permissions); } catch { perms = ['read']; }
      let whitelist: string[];
      try { whitelist = JSON.parse(form.ip_whitelist); } catch { whitelist = []; }
      const body = { name: form.name, permissions: perms, ip_whitelist: whitelist, rate_limit: Number(form.rate_limit) };
      if (edit) { await api.put(`/api-keys/${edit.id}`, body); toast('API key updated', 'success'); setShowForm(false); }
      else { const res = await api.post<ApiKey & { secret: string }>('/api-keys', body); toast('API key created', 'success'); setNewSecret(res.secret); }
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/api-keys/${id}`); toast('API key deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const regenerate = async (id: string) => {
    try {
      const res = await api.post<{ secret: string }>(`/api-keys/${id}/regenerate`, {});
      setNewSecret(res.secret);
      toast('Secret regenerated', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>API Keys</h1>
        <button onClick={openNew} style={btn}>+ New API Key</button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit API Key' : 'New API Key'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <input placeholder="Key Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
            <input type="number" placeholder="Rate Limit" value={form.rate_limit} onChange={e => setForm({ ...form, rate_limit: e.target.value })} style={input} />
            <input placeholder='Permissions JSON (e.g. ["read","write"])' value={form.permissions} onChange={e => setForm({ ...form, permissions: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
            <input placeholder='IP Whitelist JSON (e.g. ["1.2.3.4"])' value={form.ip_whitelist} onChange={e => setForm({ ...form, ip_whitelist: e.target.value })} style={{ ...input, gridColumn: 'span 2' }} />
          </div>
          {newSecret && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', borderRadius: 8, border: `1px solid rgba(34,197,94,0.2)` }}>
              <div style={{ fontSize: 13, color: colors.success, fontWeight: 600, marginBottom: 8 }}>Secret generated — copy it now, it won't be shown again!</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: 13, wordBreak: 'break-all' }}>{newSecret}</code>
                <button onClick={() => copyToClipboard(newSecret)} style={btnSm}><Copy size={14} /></button>
              </div>
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : keys.length === 0 ? (
        <p style={{ color: colors.slate }}>No API keys yet. Click "+ New API Key" to create one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Name</th><th style={th}>Key</th><th style={th}>Rate Limit</th><th style={th}>Status</th><th style={th}>Last Used</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => {
                let perms: string[] = [];
                try { perms = JSON.parse(k.permissions); } catch {}
                return (
                  <tr key={k.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...td, fontWeight: 600 }}>{k.name}</td>
                    <td style={td}>
                      <code style={{ fontSize: 12, color: colors.slate }}>{k.key.substring(0, 12)}...</code>
                    </td>
                    <td style={td}>{k.rate_limit}/min</td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: k.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: k.enabled ? colors.success : colors.danger, fontSize: 13 }}>{k.enabled ? 'Active' : 'Disabled'}</span>
                    </td>
                    <td style={{ ...td, fontSize: 13, color: colors.slate }}>{k.last_used_at || 'Never'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(k)} style={btnSm}>Edit</button>
                        <button onClick={() => regenerate(k.id)} style={btnSm} title="Regenerate Secret"><RotateCcw size={14} /></button>
                        <button onClick={() => setConfirmDelete({ id: k.id, name: k.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
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
        title="Delete API Key"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
