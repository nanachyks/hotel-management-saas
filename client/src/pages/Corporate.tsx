import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency } from '../styles';

interface CorporateAccount {
  id: string; company_name: string; contact_name: string; contact_email: string;
  contact_phone: string; credit_limit: number; payment_terms: string;
  discount_rate: number; notes: string; status: string;
}
interface CorporateRate {
  id: string; account_id: string; room_type_id: string; negotiated_price: number;
  valid_from: string; valid_until: string; room_type_name?: string;
}

const paymentTerms = ['net15', 'net30', 'net45', 'net60', 'prepaid'];

export default function Corporate() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<CorporateAccount | null>(null);
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', credit_limit: '', payment_terms: 'net30', discount_rate: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [rates, setRates] = useState<CorporateRate[]>([]);
  const [ratesAccount, setRatesAccount] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [rateForm, setRateForm] = useState({ room_type_id: '', negotiated_price: '', valid_from: '', valid_until: '' });

  const load = () => {
    setLoading(true);
    api.get<CorporateAccount[]>('/corporate')
      .then(setAccounts)
      .catch(() => toast('Failed to load corporate accounts', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEdit(null);
    setForm({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', credit_limit: '', payment_terms: 'net30', discount_rate: '', notes: '' });
    setShowForm(true);
  };
  const openEdit = (a: CorporateAccount) => {
    setEdit(a);
    setForm({
      company_name: a.company_name, contact_name: a.contact_name, contact_email: a.contact_email,
      contact_phone: a.contact_phone, credit_limit: String(a.credit_limit), payment_terms: a.payment_terms,
      discount_rate: String(a.discount_rate), notes: a.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    try {
      const body = { ...form, credit_limit: Number(form.credit_limit), discount_rate: Number(form.discount_rate) };
      if (edit) { await api.put(`/corporate/${edit.id}`, body); toast('Account updated', 'success'); }
      else { await api.post('/corporate', body); toast('Account created', 'success'); }
      setShowForm(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try { await api.del(`/corporate/${id}`); toast('Account deleted', 'success'); setConfirmDelete(null); load(); }
    catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const loadRates = async (accountId: string) => {
    setRatesAccount(accountId);
    setRatesLoading(true);
    try {
      const data = await api.get<CorporateRate[]>(`/corporate/${accountId}/rates`);
      setRates(data);
    } catch (e: any) { toast(e.message, 'error'); }
    setRatesLoading(false);
  };

  const saveRate = async () => {
    if (!ratesAccount) return;
    try {
      const body = { ...rateForm, negotiated_price: Number(rateForm.negotiated_price) };
      await api.post(`/corporate/${ratesAccount}/rates`, body);
      toast('Rate added', 'success');
      setShowRateForm(false);
      loadRates(ratesAccount);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const deleteRate = async (rateId: string) => {
    try {
      await api.del(`/corporate/rates/${rateId}`);
      toast('Rate deleted', 'success');
      if (ratesAccount) loadRates(ratesAccount);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Corporate Accounts</h1>
        <button onClick={openNew} style={btn}>+ New Account</button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={sectionTitle}>{edit ? 'Edit Account' : 'New Account'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <input placeholder="Company Name" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} style={input} />
            <input placeholder="Contact Name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={input} />
            <input placeholder="Contact Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} style={input} />
            <input placeholder="Contact Phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} style={input} />
            <input type="number" placeholder="Credit Limit" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} style={input} />
            <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} style={select}>
              {paymentTerms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Discount Rate (%)" value={form.discount_rate} onChange={e => setForm({ ...form, discount_rate: e.target.value })} style={input} />
            <input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={4} /> : accounts.length === 0 ? (
        <p style={{ color: colors.slate }}>No corporate accounts yet. Click "+ New Account" to add one.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Company</th><th style={th}>Contact</th><th style={th}>Terms</th><th style={th}>Credit Limit</th><th style={th}>Discount</th><th style={th}>Status</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{a.company_name}</div></td>
                  <td style={td}><div style={{ fontSize: 13 }}>{a.contact_name}<br />{a.contact_email}</div></td>
                  <td style={td}>{a.payment_terms}</td>
                  <td style={td}>{formatCurrency(a.credit_limit)}</td>
                  <td style={td}>{a.discount_rate}%</td>
                  <td style={td}><span style={{ padding: '2px 8px', borderRadius: 4, background: a.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: a.status === 'active' ? colors.success : colors.danger, fontSize: 13 }}>{a.status}</span></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => loadRates(a.id)} style={btnSm}>Rates</button>
                      <button onClick={() => openEdit(a)} style={btnSm}>Edit</button>
                      <button onClick={() => setConfirmDelete({ id: a.id, name: a.company_name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ratesAccount && (
        <div style={{ ...card, marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={sectionTitle}>Negotiated Rates</h2>
            <button onClick={() => { setShowRateForm(true); setRateForm({ room_type_id: '', negotiated_price: '', valid_from: '', valid_until: '' }); }} style={btnSm}>+ Add Rate</button>
          </div>
          {showRateForm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <input placeholder="Room Type ID" value={rateForm.room_type_id} onChange={e => setRateForm({ ...rateForm, room_type_id: e.target.value })} style={input} />
              <input type="number" step="0.01" placeholder="Negotiated Price" value={rateForm.negotiated_price} onChange={e => setRateForm({ ...rateForm, negotiated_price: e.target.value })} style={input} />
              <input type="date" placeholder="Valid From" value={rateForm.valid_from} onChange={e => setRateForm({ ...rateForm, valid_from: e.target.value })} style={input} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="date" placeholder="Valid Until" value={rateForm.valid_until} onChange={e => setRateForm({ ...rateForm, valid_until: e.target.value })} style={input} />
                <button onClick={saveRate} style={btnSm}>Save</button>
                <button onClick={() => setShowRateForm(false)} style={{ ...btnSm, color: colors.slate }}>X</button>
              </div>
            </div>
          )}
          {ratesLoading ? <LoadingSkeleton rows={2} /> : rates.length === 0 ? (
            <p style={{ color: colors.slate }}>No negotiated rates yet.</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={th}>Room Type</th><th style={th}>Price</th><th style={th}>Valid From</th><th style={th}>Valid Until</th><th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={td}>{r.room_type_name || r.room_type_id}</td>
                      <td style={td}>{formatCurrency(r.negotiated_price)}</td>
                      <td style={td}>{r.valid_from || '-'}</td>
                      <td style={td}>{r.valid_until || '-'}</td>
                      <td style={td}><button onClick={() => deleteRate(r.id)} style={{ ...btnSm, color: colors.danger }}>Del</button></td>
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
        title="Delete Account"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This will also remove all negotiated rates.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
