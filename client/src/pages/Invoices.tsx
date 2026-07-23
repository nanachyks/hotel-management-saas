import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useCurrency } from '../context/CurrencyContext';
import { btn, btnSm, input, select, card, pageTitle, tableHeader as th, tableCell as td, colors, glass } from '../styles';
import { Download, Printer } from 'lucide-react';

interface Invoice { id: string; guest_name: string; room_number: string; amount: number; paid_amount: number; discount: number; tax_amount: number; deposit: number; status: string; due_date: string; check_in_date: string; check_out_date: string; booking_status: string; }

const payMethods = ['cash', 'card', 'mobile_money', 'bank_transfer'];

export default function Invoices() {
  const { toast } = useToast();
  const { f } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [confirmRefund, setConfirmRefund] = useState<Invoice | null>(null);

  const load = (status?: string) => {
    setLoading(true);
    api.get<Invoice[]>(`/invoices${status ? `?status=${status}` : ''}`)
      .then(setInvoices)
      .catch(() => toast('Failed to load invoices', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openPay = (inv: Invoice) => {
    setPayModal(inv);
    setPayForm({ amount: String(inv.amount - inv.paid_amount), method: 'cash', reference: '', notes: '' });
  };

  const recordPayment = async () => {
    if (!payModal || !payForm.amount) return;
    try {
      await api.post(`/invoices/${payModal.id}/pay`, payForm);
      toast('Payment recorded', 'success');
      setPayModal(null); load(filter);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const refund = async (id: string) => {
    if (!confirmRefund) return;
    try { await api.post(`/invoices/${id}/refund`, {}); toast('Refund processed', 'success'); setConfirmRefund(null); load(filter); }
    catch (e: any) { toast(e.message, 'error'); setConfirmRefund(null); }
  };

  const downloadReceipt = (id: string) => {
    api.download(`/invoices/${id}/receipt`, `receipt-${id}.pdf`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Invoices</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api.download('/export/invoices/csv', 'invoices.csv')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> CSV</button>
          <button onClick={() => api.download('/export/invoices/pdf', 'invoices.pdf')} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> PDF</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['', 'pending', 'paid', 'partial', 'cancelled', 'refunded'].map(s => (
            <button key={s} onClick={() => { setFilter(s); load(s); }}
              style={{ ...btnSm, background: filter === s ? colors.primary : colors.input, color: filter === s ? '#fff' : colors.dark }}>
              {s || 'All'}
            </button>
          ))}
        </div>

      {loading ? <LoadingSkeleton /> : invoices.length === 0 ? (
        <p style={{ color: colors.slate }}>No invoices found.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Guest</th><th style={th}>Room</th><th style={th}>Amount</th><th style={th}>Paid</th><th style={th}>Balance</th><th style={th}>Discount</th><th style={th}>Tax</th><th style={th}>Status</th><th style={th}>Due</th><th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const balance = inv.amount - inv.paid_amount;
                return (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={td}>{inv.guest_name}</td>
                    <td style={td}>{inv.room_number}</td>
                    <td style={td}>{f(inv.amount)}</td>
                    <td style={td}>{f(inv.paid_amount)}</td>
                    <td style={td}>{f(balance)}</td>
                    <td style={td}>{inv.discount > 0 ? f(inv.discount) : '-'}</td>
                    <td style={td}>{inv.tax_amount > 0 ? f(inv.tax_amount) : '-'}</td>
                    <td style={td}><StatusBadge status={inv.status} /></td>
                    <td style={td}>{inv.due_date}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(inv.status === 'pending' || inv.status === 'partial') && (
                          <button onClick={() => openPay(inv)} style={btnSm}>Pay</button>
                        )}
                        {inv.paid_amount > 0 && (
                          <button onClick={() => downloadReceipt(inv.id)} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 4 }}><Printer size={12} /> Receipt</button>
                        )}
                        {(inv.status === 'paid' || inv.status === 'partial') && inv.paid_amount > 0 && (
                          <button onClick={() => setConfirmRefund(inv)} style={{ ...btnSm, color: colors.danger }}>Refund</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...card, padding: 28, width: 440, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Record Payment</h2>
            <div style={{ fontSize: 14, color: colors.slate, marginBottom: 16 }}>
              Invoice: {payModal.guest_name} - Room {payModal.room_number}<br />
              Total: {f(payModal.amount)} | Paid: {f(payModal.paid_amount)} | Balance: {f(payModal.amount - payModal.paid_amount)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="number" step="0.01" placeholder="Payment amount" value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })} style={input} />
              <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} style={select}>
                {payMethods.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
              <input placeholder="Reference (optional)" value={payForm.reference}
                onChange={e => setPayForm({ ...payForm, reference: e.target.value })} style={input} />
              <input placeholder="Notes (optional)" value={payForm.notes}
                onChange={e => setPayForm({ ...payForm, notes: e.target.value })} style={input} />
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={recordPayment} style={btn}>Record Payment</button>
              <button onClick={() => setPayModal(null)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmRefund}
        title="Process Refund"
        message={`Are you sure you want to process a full refund for ${confirmRefund?.guest_name} (${confirmRefund ? f(confirmRefund.paid_amount) : ''})?`}
        confirmLabel="Process Refund"
        danger
        onConfirm={() => refund(confirmRefund!.id)}
        onCancel={() => setConfirmRefund(null)}
      />
    </div>
  );
}
