import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, colors, glass, formatCurrency } from '../styles';

interface Period { id: string; start_date: string; end_date: string; status: string; processed_at: string; }
interface Deduction { id: string; name: string; type: string; value: number; is_mandatory: number; }
interface Entry { id: string; employee_id: string; first_name: string; last_name: string; position: string; base_pay: number; overtime_pay: number; bonuses: number; deductions_total: number; net_pay: number; status: string; }
interface Payslip { id: string; entry_id: string; employee_id: string; first_name: string; last_name: string; gross_pay: number; net_pay: number; deductions_breakdown: string; generated_at: string; start_date: string; end_date: string; }

export default function Payroll() {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({ start_date: '', end_date: '' });
  const [dedForm, setDedForm] = useState({ name: '', type: 'percentage', value: '', is_mandatory: false });
  const [tab, setTab] = useState<'periods' | 'process' | 'payslips' | 'deductions'>('periods');

  const loadPeriods = () => api.get<Period[]>('/payroll/periods').then(setPeriods).catch(() => {});
  const loadDeductions = () => api.get<Deduction[]>('/payroll/deductions').then(setDeductions).catch(() => {});
  const loadEntries = (pid: string) => {
    setSelectedPeriod(pid);
    if (pid) api.get<Entry[]>(`/payroll/entries?period_id=${pid}`).then(setEntries).catch(() => {});
    else setEntries([]);
  };
  const loadPayslips = (pid: string) => {
    if (pid) api.get<Payslip[]>(`/payroll/payslips?period_id=${pid}`).then(setPayslips).catch(() => {});
    else setPayslips([]);
  };

  useEffect(() => { loadPeriods(); loadDeductions(); }, []);

  const createPeriod = async () => {
    if (!periodForm.start_date || !periodForm.end_date) return;
    try { await api.post('/payroll/periods', periodForm); toast('Pay period created', 'success'); setShowNewPeriod(false); loadPeriods(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const addDeduction = async () => {
    if (!dedForm.name || !dedForm.value) return;
    try { await api.post('/payroll/deductions', { ...dedForm, value: Number(dedForm.value), is_mandatory: dedForm.is_mandatory }); toast('Deduction added', 'success'); setDedForm({ name: '', type: 'percentage', value: '', is_mandatory: false }); loadDeductions(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const processPayroll = async (periodId: string) => {
    try {
      const res = await api.post<{ message: string; entries: number; totalPayroll: number }>('/payroll/process', { period_id: periodId });
      toast(`${res.message}: ${res.entries} employees, total ${formatCurrency(res.totalPayroll)}`, 'success');
      loadPeriods(); loadEntries(periodId);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const removeDeduction = async (id: string) => {
    try { await api.del(`/payroll/deductions/${id}`); toast('Deduction removed', 'success'); loadDeductions(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const tabs = [
    { key: 'periods', label: 'Pay Periods' },
    { key: 'process', label: 'Process Payroll' },
    { key: 'payslips', label: 'Payslips' },
    { key: 'deductions', label: 'Deductions' },
  ];

  const openPeriods = periods.filter(p => p.status === 'open' || p.status === 'processing');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Payroll</h1>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: tab === t.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
            color: tab === t.key ? '#a78bfa' : colors.slate, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'periods' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setShowNewPeriod(!showNewPeriod)} style={btn}>+ New Pay Period</button>
          </div>
          {showNewPeriod && (
            <div style={{ ...card, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'end' }}>
              <div><label style={{ fontSize: 12, color: colors.slate }}>Start Date</label><input type="date" value={periodForm.start_date} onChange={e => setPeriodForm({ ...periodForm, start_date: e.target.value })} style={input} /></div>
              <div><label style={{ fontSize: 12, color: colors.slate }}>End Date</label><input type="date" value={periodForm.end_date} onChange={e => setPeriodForm({ ...periodForm, end_date: e.target.value })} style={input} /></div>
              <button onClick={createPeriod} style={btn}>Create</button>
              <button onClick={() => setShowNewPeriod(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
            </div>
          )}
          {periods.length === 0 ? <p style={{ color: colors.slate }}>No pay periods yet.</p> : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Period</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Actions</th>
                </tr></thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '10px 16px' }}>{p.start_date} → {p.end_date}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: p.status === 'closed' ? 'rgba(34,197,94,0.15)' : p.status === 'processing' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                          color: p.status === 'closed' ? '#22c55e' : p.status === 'processing' ? '#f59e0b' : '#3b82f6',
                        }}>{p.status}</span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {p.status === 'open' && <button onClick={() => processPayroll(p.id)} style={{ ...btnSm, color: '#22c55e' }}>Process</button>}
                        {p.status === 'closed' && <button onClick={() => { loadPayslips(p.id); setTab('payslips'); }} style={{ ...btnSm, color: colors.slate }}>View Payslips</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'process' && (
        <div>
          {openPeriods.length === 0 ? (
            <p style={{ color: colors.slate }}>No open pay periods. Create one first.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {openPeriods.map(p => (
                <div key={p.id} style={{ ...glass, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.start_date} → {p.end_date}</div>
                    <div style={{ fontSize: 13, color: colors.slate }}>Status: {p.status}</div>
                  </div>
                  <button onClick={() => processPayroll(p.id)} style={{ ...btn, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}>
                    Run Payroll
                  </button>
                </div>
              ))}
            </div>
          )}
          {entries.length > 0 && (
            <div style={{ ...card, padding: 0, overflow: 'hidden', marginTop: 20 }}>
              <h2 style={{ ...sectionTitle, padding: 16 }}>Payroll Entries</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Base Pay</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Deductions</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Net Pay</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.slate, fontWeight: 600 }}>Status</th>
                </tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '10px 16px' }}>{e.first_name} {e.last_name} <span style={{ fontSize: 12, color: colors.slate }}>{e.position}</span></td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCurrency(e.base_pay)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#ef4444' }}>-{formatCurrency(e.deductions_total)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>{formatCurrency(e.net_pay)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: e.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                          color: e.status === 'paid' ? '#22c55e' : '#f59e0b',
                        }}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'payslips' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <select value={selectedPeriod} onChange={e => { loadPayslips(e.target.value); }} style={{ ...select, width: 250 }}>
              <option value="">Select period</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.start_date} → {p.end_date}</option>)}
            </select>
          </div>
          {payslips.length === 0 ? <p style={{ color: colors.slate }}>Select a period to view payslips.</p> : (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {payslips.map(ps => {
                const breakdown = JSON.parse(ps.deductions_breakdown || '[]');
                return (
                  <div key={ps.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div><div style={{ fontWeight: 600, fontSize: 16 }}>{ps.first_name} {ps.last_name}</div><div style={{ fontSize: 13, color: colors.slate }}>{ps.start_date} → {ps.end_date}</div></div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e', marginBottom: 12 }}>{formatCurrency(ps.net_pay)}</div>
                    <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                        <span style={{ color: colors.slate }}>Gross Pay</span><span>{formatCurrency(ps.gross_pay)}</span>
                      </div>
                      {breakdown.map((d: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: colors.slate }}>{d.name}</span><span style={{ color: '#ef4444' }}>-{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, borderTop: `1px solid ${colors.borderLight}`, paddingTop: 8, marginTop: 8 }}>
                        <span>Net Pay</span><span style={{ color: '#22c55e' }}>{formatCurrency(ps.net_pay)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'deductions' && (
        <div>
          <div style={{ ...card, marginBottom: 20 }}>
            <h2 style={sectionTitle}>Add Deduction</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
              <div><label style={{ fontSize: 12, color: colors.slate }}>Name</label><input value={dedForm.name} onChange={e => setDedForm({ ...dedForm, name: e.target.value })} placeholder="e.g. Union Dues" style={input} /></div>
              <div><label style={{ fontSize: 12, color: colors.slate }}>Type</label><select value={dedForm.type} onChange={e => setDedForm({ ...dedForm, type: e.target.value })} style={select}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div>
              <div><label style={{ fontSize: 12, color: colors.slate }}>Value</label><input type="number" step="0.1" value={dedForm.value} onChange={e => setDedForm({ ...dedForm, value: e.target.value })} style={{ ...input, width: 100 }} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: colors.slate, marginBottom: 6 }}>
                <input type="checkbox" checked={dedForm.is_mandatory} onChange={e => setDedForm({ ...dedForm, is_mandatory: e.target.checked })} /> Mandatory
              </label>
              <button onClick={addDeduction} style={btn}>Add</button>
            </div>
          </div>
          {deductions.map(d => (
            <div key={d.id} style={{ ...glass, padding: '12px 18px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><span style={{ fontWeight: 600 }}>{d.name}</span> <span style={{ color: colors.slate, marginLeft: 8 }}>{d.value}{d.type === 'percentage' ? '%' : ''}</span> {d.is_mandatory ? <span style={{ color: '#3b82f6', fontSize: 12 }}>Mandatory</span> : null}</div>
              <button onClick={() => removeDeduction(d.id)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 13 }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
