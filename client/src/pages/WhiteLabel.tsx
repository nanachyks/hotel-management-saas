import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ColorPicker from '../components/ColorPicker';
import { btn, btnSm, input, card, pageTitle, sectionTitle, colors } from '../styles';

interface WhiteLabelSettings {
  id: string; hotel_id: string; custom_domain: string; favicon_url: string;
  primary_color: string; logo_url: string; email_from_name: string;
  email_logo_url: string; custom_css: string; footer_text: string;
}

export default function WhiteLabel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WhiteLabelSettings | null>(null);
  const [form, setForm] = useState({
    custom_domain: '', favicon_url: '', primary_color: '#3b82f6', logo_url: '',
    email_from_name: '', email_logo_url: '', custom_css: '', footer_text: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<WhiteLabelSettings>('/white-label')
      .then(data => {
        setSettings(data);
        setForm({
          custom_domain: data.custom_domain || '',
          favicon_url: data.favicon_url || '',
          primary_color: data.primary_color || '#3b82f6',
          logo_url: data.logo_url || '',
          email_from_name: data.email_from_name || '',
          email_logo_url: data.email_logo_url || '',
          custom_css: data.custom_css || '',
          footer_text: data.footer_text || '',
        });
      })
      .catch(() => toast('Failed to load white-label settings', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/white-label', form);
      toast('Settings saved', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  };

  if (loading) return <LoadingSkeleton rows={8} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>White-Label Settings</h1>
      </div>

      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={sectionTitle}>Brand Colors</h2>
        <ColorPicker />
      </div>

      <div style={{ ...card }}>
        <h2 style={sectionTitle}>Branding</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Custom Domain</label>
            <input placeholder="e.g. app.yourbrand.com" value={form.custom_domain} onChange={e => setForm({ ...form, custom_domain: e.target.value })} style={input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Logo URL</label>
            <input placeholder="https://yourcdn.com/logo.png" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} style={input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Favicon URL</label>
            <input placeholder="https://yourcdn.com/favicon.ico" value={form.favicon_url} onChange={e => setForm({ ...form, favicon_url: e.target.value })} style={input} />
          </div>
        </div>

        <h2 style={sectionTitle}>Email</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Email From Name</label>
            <input placeholder="e.g. My Hotel" value={form.email_from_name} onChange={e => setForm({ ...form, email_from_name: e.target.value })} style={input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Email Logo URL</label>
            <input placeholder="https://yourcdn.com/email-logo.png" value={form.email_logo_url} onChange={e => setForm({ ...form, email_logo_url: e.target.value })} style={input} />
          </div>
        </div>

        <h2 style={sectionTitle}>Customization</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Custom CSS</label>
            <textarea placeholder="/* Custom styles */" value={form.custom_css} onChange={e => setForm({ ...form, custom_css: e.target.value })} style={{ ...input, height: 100, fontFamily: 'monospace', fontSize: 12, gridColumn: 'span 2' as any }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: colors.slate, marginBottom: 6 }}>Footer Text</label>
            <input placeholder="© 2024 My Hotel. All rights reserved." value={form.footer_text} onChange={e => setForm({ ...form, footer_text: e.target.value })} style={input} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} style={btn} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </div>
    </div>
  );
}
