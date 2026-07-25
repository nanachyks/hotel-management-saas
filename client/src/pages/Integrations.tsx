import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, colors, glass } from '../styles';
import { Plug, Globe, CreditCard, ShoppingCart, BookOpen, Lock, KeyRound, RefreshCw, Trash2, Plus, Check, X } from 'lucide-react';

interface Integration {
  id: string; type: string; provider: string; name: string;
  api_key: string; api_secret: string; endpoint_url: string;
  credentials: string; enabled: number; last_sync_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; desc: string; providers: { value: string; label: string }[] }> = {
  channel_manager: { label: 'Channel Managers', icon: <Globe size={18} />, desc: 'Sync room availability, rates, and bookings with online travel agencies.',
    providers: [
      { value: 'bookingdotcom', label: 'Booking.com' }, { value: 'expedia', label: 'Expedia' },
      { value: 'airbnb', label: 'Airbnb' }, { value: 'direct', label: 'Direct Channel' },
    ]},
  payment_gateway: { label: 'Payment Gateways', icon: <CreditCard size={18} />, desc: 'Accept online payments, deposits, and subscription billing.',
    providers: [
      { value: 'paystack', label: 'Paystack' }, { value: 'stripe', label: 'Stripe' },
      { value: 'flutterwave', label: 'Flutterwave' }, { value: 'interswitch', label: 'Interswitch' },
      { value: 'square', label: 'Square' },
    ]},
  pos: { label: 'POS Systems', icon: <ShoppingCart size={18} />, desc: 'Connect your point-of-sale for restaurant, bar, and retail transactions.',
    providers: [
      { value: 'square', label: 'Square' }, { value: 'vend', label: 'Vend' },
      { value: 'lightspeed', label: 'Lightspeed' }, { value: 'clover', label: 'Clover' },
    ]},
  accounting: { label: 'Accounting Software', icon: <BookOpen size={18} />, desc: 'Automatically sync invoices, expenses, and financial reports.',
    providers: [
      { value: 'quickbooks', label: 'QuickBooks' }, { value: 'xero', label: 'Xero' },
      { value: 'freshbooks', label: 'FreshBooks' }, { value: 'sage', label: 'Sage' },
    ]},
  door_lock: { label: 'Door Lock Systems', icon: <Lock size={18} />, desc: 'Integrate with electronic door locks for keyless check-in.',
    providers: [
      { value: 'assa_abloy', label: 'ASSA ABLOY' }, { value: 'salto', label: 'Salto' },
      { value: 'onity', label: 'Onity' }, { value: 'dormakaba', label: 'Dormakaba' },
    ]},
  key_card: { label: 'Key Card Systems', icon: <KeyRound size={18} />, desc: 'Encode key cards at check-in with guest room assignments.',
    providers: [
      { value: 'kaba', label: 'Kaba' }, { value: 'saflok', label: 'Saflok' },
      { value: 'vingcard', label: 'VingCard' }, { value: 'ils', label: 'ILS' },
    ]},
};

export default function Integrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeType, setActiveType] = useState('channel_manager');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: '', provider: '', name: '', api_key: '', api_secret: '', endpoint_url: '' });
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = (type?: string) => {
    const qs = type ? `?type=${type || activeType}` : '';
    api.get<Integration[]>(`/integrations${qs}`).then(setIntegrations).catch(() => {});
  };
  useEffect(() => { load(activeType); }, [activeType]);

  const openNew = (type: string) => {
    setEditId(null);
    setForm({ type, provider: TYPE_CONFIG[type].providers[0]?.value || '', name: '', api_key: '', api_secret: '', endpoint_url: '' });
    setShowAdd(true);
  };

  const openEdit = (int: Integration) => {
    setEditId(int.id);
    setForm({ type: int.type, provider: int.provider, name: int.name, api_key: int.api_key, api_secret: int.api_secret, endpoint_url: int.endpoint_url });
    setShowAdd(true);
  };

  const save = async () => {
    try {
      const body = { ...form };
      if (editId) { await api.put(`/integrations/${editId}`, body); toast('Integration updated', 'success'); }
      else { await api.post('/integrations', body); toast('Integration added', 'success'); }
      setShowAdd(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    try { await api.del(`/integrations/${id}`); toast('Integration removed', 'success'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const sync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await api.post<any>(`/integrations/${id}/sync`, {});
      toast(`${res.message}: ${res.roomsSynced || res.recentPayments?.count || res.exportReady?.count || res.menuItems || res.rooms || 0} items synced`, 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSyncing(null); }
  };

  const types = Object.entries(TYPE_CONFIG);
  const filtered = integrations.filter(i => i.type === activeType);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Integrations</h1>
        <button onClick={() => openNew(activeType)} style={btn}><Plus size={16} /> Add {TYPE_CONFIG[activeType]?.label.slice(0, -1) || 'Integration'}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {types.map(([key, cfg]) => (
          <button key={key} onClick={() => { setActiveType(key); setShowAdd(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 8, border: 'none',
            background: activeType === key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeType === key ? '#a78bfa' : colors.slate, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}>{cfg.icon} {cfg.label}</button>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ color: '#a78bfa', marginTop: 2 }}>{TYPE_CONFIG[activeType]?.icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{TYPE_CONFIG[activeType]?.label}</div>
            <div style={{ fontSize: 14, color: colors.slate, lineHeight: 1.5 }}>{TYPE_CONFIG[activeType]?.desc}</div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{editId ? 'Edit' : 'Add'} {TYPE_CONFIG[form.type]?.label.slice(0, -1) || 'Integration'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: colors.slate, marginBottom: 4, display: 'block' }}>Provider</label>
              <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value, name: TYPE_CONFIG[form.type]?.providers.find(p => p.value === e.target.value)?.label || '' })}
                style={{ ...select, width: '100%' }} disabled={!!editId}>
                {TYPE_CONFIG[form.type]?.providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: colors.slate, marginBottom: 4, display: 'block' }}>Connection Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: colors.slate, marginBottom: 4, display: 'block' }}>API Key / Username</label>
              <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} style={{ ...input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: colors.slate, marginBottom: 4, display: 'block' }}>API Secret / Password</label>
              <input type="password" value={form.api_secret} onChange={e => setForm({ ...form, api_secret: e.target.value })} style={{ ...input, width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, color: colors.slate, marginBottom: 4, display: 'block' }}>Endpoint URL (optional)</label>
              <input value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })} placeholder="https://api.provider.com/v2/" style={{ ...input, width: '100%' }} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ ...glass, padding: 40, textAlign: 'center' }}>
          <Plug size={40} style={{ color: colors.slate, marginBottom: 12, opacity: 0.3 }} />
          <p style={{ color: colors.slate }}>No {TYPE_CONFIG[activeType]?.label.toLowerCase()} configured yet.</p>
          <button onClick={() => openNew(activeType)} style={{ ...btn, marginTop: 12 }}>Add {TYPE_CONFIG[activeType]?.label.slice(0, -1) || 'Integration'}</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(int => (
            <div key={int.id} style={{ ...glass, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: int.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: int.enabled ? '#22c55e' : colors.slate,
                  }}>{int.enabled ? <Check size={18} /> : <X size={18} />}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{int.name}</div>
                    <div style={{ fontSize: 13, color: colors.slate, textTransform: 'capitalize' }}>{int.provider.replace('_', ' ')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => sync(int.id)} disabled={syncing === int.id}
                    style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 4, color: colors.primary }}>
                    <RefreshCw size={14} className={syncing === int.id ? 'spin' : ''} /> Sync
                  </button>
                  <button onClick={() => openEdit(int)} style={{ ...btnSm, color: colors.slate }}>Edit</button>
                  <button onClick={() => remove(int.id)} style={{ ...btnSm, color: colors.danger }}><Trash2 size={14} /></button>
                </div>
              </div>
              {int.last_sync_at && <div style={{ fontSize: 12, color: colors.slate }}>Last synced: {int.last_sync_at}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
