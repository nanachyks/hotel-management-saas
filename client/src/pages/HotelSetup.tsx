import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, colors, glass } from '../styles';
import { Plus, Trash2, Percent, RefreshCw } from 'lucide-react';

interface Hotel {
  id: string; name: string; slug: string; email: string; phone: string;
  address: string; logo_url: string | null; currency: string; tax_rate: number;
  timezone: string; check_in_time: string; check_out_time: string;
}

interface Tax {
  id: string; hotel_id: string; name: string; rate: number; type: string; is_mandatory: number;
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Accra', 'Africa/Lagos', 'Africa/Nairobi',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR', 'AED', 'INR', 'JPY', 'CNY', 'AUD', 'CAD'];

export default function HotelSetup() {
  const { toast } = useToast();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', logo_url: '',
    currency: 'USD', tax_rate: '0', timezone: 'UTC',
    check_in_time: '14:00', check_out_time: '11:00',
  });
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [newTax, setNewTax] = useState({ name: '', rate: '', type: 'percentage', is_mandatory: false });
  const [exchangeRates, setExchangeRates] = useState<{ from_currency: string; to_currency: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTaxes = () => api.get<Tax[]>('/taxes').then(setTaxes).catch(() => {});

  useEffect(() => {
    api.get<Hotel>('/hotels/settings')
      .then(h => {
        setHotel(h);
        setForm({
          name: h.name, email: h.email || '', phone: h.phone || '', address: h.address || '', logo_url: h.logo_url || '',
          currency: h.currency, tax_rate: String(h.tax_rate), timezone: h.timezone,
          check_in_time: h.check_in_time, check_out_time: h.check_out_time,
        });
      })
      .catch(() => toast('Failed to load hotel settings', 'error'))
      .finally(() => setLoading(false));
    loadTaxes();
    api.get<{ from_currency: string; to_currency: string; rate: number }[]>('/currencies/rates').then(setExchangeRates).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put<Hotel>('/hotels/settings', {
        ...form,
        tax_rate: parseFloat(form.tax_rate) || 0,
        logo_url: form.logo_url || null,
      });
      setHotel(updated);
      await api.put('/currencies/rates', {
        rates: exchangeRates
          .filter(r => r.from_currency === form.currency && r.to_currency !== form.currency && r.rate > 0)
          .map(r => ({ from: r.from_currency, to: r.to_currency, rate: r.rate }))
      });
      toast('Hotel settings updated', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addTax = async () => {
    if (!newTax.name || !newTax.rate) return;
    try {
      await api.post('/taxes', {
        name: newTax.name,
        rate: parseFloat(newTax.rate),
        type: newTax.type,
        is_mandatory: newTax.is_mandatory,
      });
      setNewTax({ name: '', rate: '', type: 'percentage', is_mandatory: false });
      await loadTaxes();
      toast('Tax added', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const deleteTax = async (id: string) => {
    try {
      await api.del(`/taxes/${id}`);
      await loadTaxes();
      toast('Tax removed', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (loading) return <p style={{ color: colors.slate }}>Loading...</p>;

  return (
    <div>
      <h1 style={pageTitle}>Hotel Setup</h1>

      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={sectionTitle}>General Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Hotel Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Slug</label>
            <input value={hotel?.slug || ''} disabled style={{ ...input, width: '100%', opacity: 0.5 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Address</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Logo URL</label>
            <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://example.com/logo.png" style={{ ...input, width: '100%' }} />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={sectionTitle}>Regional Settings</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Currency</label>
            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ ...select, width: '100%' }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Base Tax Rate (%)</label>
            <input type="number" step="0.1" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Timezone</label>
            <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} style={{ ...select, width: '100%' }}>
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Percent size={18} /> Ghana Tax Configuration
        </h2>
        <p style={{ color: colors.slate, fontSize: 14, marginBottom: 16 }}>
          These taxes are automatically applied to invoices based on Ghana Revenue Authority guidelines.
        </p>

        {taxes.length > 0 ? (
          <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            {taxes.map(tax => (
              <div key={tax.id} style={{ ...glass, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: colors.dark, fontWeight: 600, fontSize: 15 }}>{tax.name}</span>
                  <span style={{ color: colors.slate, marginLeft: 12, fontSize: 14 }}>{tax.rate}%</span>
                  {tax.is_mandatory ? <span style={{ color: colors.primary, fontSize: 12, marginLeft: 8 }}>Mandatory</span> : null}
                </div>
                <button onClick={() => deleteTax(tax.id)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: colors.slate, fontSize: 14, marginBottom: 20 }}>No custom taxes configured. Default Ghana taxes (VAT, NHIL, GetFund, COVID-19 Levy) are auto-applied.</p>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: colors.slate, marginBottom: 4 }}>Tax Name</label>
            <input value={newTax.name} onChange={e => setNewTax({ ...newTax, name: e.target.value })} placeholder="e.g. Tourism Levy" style={{ ...input, width: 160 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: colors.slate, marginBottom: 4 }}>Rate (%)</label>
            <input type="number" step="0.1" value={newTax.rate} onChange={e => setNewTax({ ...newTax, rate: e.target.value })} placeholder="2.5" style={{ ...input, width: 100 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: colors.slate, marginBottom: 4 }}>Type</label>
            <select value={newTax.type} onChange={e => setNewTax({ ...newTax, type: e.target.value })} style={{ ...select, width: 120 }}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.slate, fontSize: 14, marginBottom: 12 }}>
            <input type="checkbox" checked={newTax.is_mandatory} onChange={e => setNewTax({ ...newTax, is_mandatory: e.target.checked })} />
            Mandatory
          </label>
          <button onClick={addTax} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Plus size={14} /> Add Tax
          </button>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={sectionTitle}>Check-In / Check-Out Times</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Check-In Time</label>
            <input type="time" value={form.check_in_time} onChange={e => setForm({ ...form, check_in_time: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.slate, marginBottom: 6 }}>Check-Out Time</label>
            <input type="time" value={form.check_out_time} onChange={e => setForm({ ...form, check_out_time: e.target.value })} style={{ ...input, width: '100%' }} />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={18} /> Exchange Rates
        </h2>
        <p style={{ color: colors.slate, fontSize: 14, marginBottom: 16 }}>
          Set conversion rates from your base currency ({form.currency}) to other accepted currencies.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {exchangeRates.filter(r => r.from_currency === form.currency && r.to_currency !== form.currency).map(r => (
            <div key={`${r.from_currency}-${r.to_currency}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 60, fontSize: 14, fontWeight: 600, color: colors.dark }}>{r.to_currency}</span>
              <input type="number" step="0.0001" value={r.rate}
                onChange={e => setExchangeRates(prev => prev.map(x =>
                  x.from_currency === r.from_currency && x.to_currency === r.to_currency
                    ? { ...x, rate: Number(e.target.value) }
                    : x
                ))}
                style={{ ...input, width: 120 }} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={btn}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
