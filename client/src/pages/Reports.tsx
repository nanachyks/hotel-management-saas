import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency, colors, card, pageTitle, glass, sectionTitle } from '../styles';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, BarChart3,
  Users, Building2, CalendarDays, UserCheck, BedDouble, Download,
} from 'lucide-react';

interface MonthlyRevenue { month: string; revenue: number; tax: number; invoice_count: number; }
interface PaymentMethod { method: string; total: number; count: number; }
interface ExpenseCat { category: string; total: number; count: number; }
interface TaxMonth { month: string; tax: number; }

interface OccupancyData {
  currentRate: number;
  totalRooms: number;
  nightsSold: number;
  nightsAvailable: number;
  monthlyTrend: { month: string; rate: number; nightsSold: number; nightsAvailable: number }[];
}

interface AdrRevparTrend { month: string; adr: number; revpar: number; revenue: number; nightsSold: number; }

interface BookingSource { source: string; count: number; revenue: number; }
interface BookingTrend { month: string; count: number; }
interface TopGuest { id: string; guest_name: string; email: string; booking_count: number; total_spent: number; }

interface GuestDemographics {
  bookingsBySource: BookingSource[];
  avgLengthOfStay: number;
  repeatGuests: number;
  newGuests: number;
  totalGuests: number;
  bookingTrend: BookingTrend[];
  topGuests: TopGuest[];
}

interface ReportData {
  dailySales: { total: number; tax: number; date: string };
  monthlySales: { total: number; tax: number; month: string };
  totalRevenue: { total: number; tax: number };
  totalExpenses: number;
  netRevenue: number;
  pendingInvoices: { count: number; total: number };
  monthlyRevenue: MonthlyRevenue[];
  paymentsByMethod: PaymentMethod[];
  expensesByCategory: ExpenseCat[];
  taxByMonth: TaxMonth[];
  occupancy: OccupancyData;
  adr: number;
  revpar: number;
  adrRevparTrend: AdrRevparTrend[];
  guestDemographics: GuestDemographics;
}

const methodLabels: Record<string, string> = { cash: 'Cash', card: 'Card', mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer' };

const chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
  const tooltipStyle = {
  background: 'rgba(18,18,30,0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 13,
};

const formatRev = (v: any) => [formatCurrency(Number(v)), 'Revenue'] as any;
const formatPct = (v: any) => [`${v}%`, 'Occupancy'] as any;
const formatCurr = (v: any) => [formatCurrency(Number(v)), ''] as any;
const formatAdr = (v: any) => [formatCurrency(Number(v)), 'ADR'] as any;

const sourceLabels: Record<string, string> = { walk_in: 'Walk-in', online: 'Online', phone: 'Phone', corporate: 'Corporate', group: 'Group' };

export default function Reports() {
  const { f } = useCurrency();
  const [data, setData] = useState<ReportData | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => { api.get<ReportData>('/reports/summary').then(setData).catch(console.error); }, []);

  const handleExportCSV = () => {
    api.download('/export/reports/summary/csv', 'report-summary.csv');
  };

  if (!data) return <div style={{ color: colors.slate }}>Loading...</div>;

  const profitMargin = data.totalRevenue.total > 0
    ? Math.round((data.netRevenue / data.totalRevenue.total) * 100)
    : 0;

  const summaryCards = [
    { label: 'Occupancy', value: `${data.occupancy.currentRate}%`, sub: `${data.occupancy.nightsSold} / ${data.occupancy.nightsAvailable} nights`, color: '#8b5cf6', icon: <BedDouble size={20} /> },
    { label: 'ADR', value: f(data.adr), sub: 'Avg Daily Rate', color: '#06b6d4', icon: <DollarSign size={20} /> },
    { label: 'RevPAR', value: f(data.revpar), sub: 'Rev Per Available Room', color: '#3b82f6', icon: <TrendingUp size={20} /> },
    { label: 'Daily Sales', value: f(data.dailySales.total), sub: `Today (${data.dailySales.date})`, color: '#22c55e', icon: <DollarSign size={20} /> },
    { label: 'Monthly Sales', value: f(data.monthlySales.total), sub: 'This month', color: '#3b82f6', icon: <BarChart3 size={20} /> },
    { label: 'Total Revenue', value: f(data.totalRevenue.total), sub: `Tax: ${f(data.totalRevenue.tax)}`, color: '#10b981', icon: <TrendingUp size={20} /> },
    { label: 'Total Expenses', value: f(data.totalExpenses), sub: '', color: '#ef4444', icon: <TrendingDown size={20} /> },
    { label: 'Net Profit', value: f(data.netRevenue), sub: `${profitMargin}% margin`, color: data.netRevenue >= 0 ? '#22c55e' : '#ef4444', icon: <DollarSign size={20} /> },
    { label: 'Pending Invoices', value: `${data.pendingInvoices.count}`, sub: `${f(data.pendingInvoices.total)} due`, color: '#f59e0b', icon: <Receipt size={20} /> },
  ];

  const tabBtn = (t: string) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    background: tab === t ? colors.primary : colors.input, color: tab === t ? '#fff' : colors.dark,
  });

  const renderOverview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={card}>
        <h2 style={sectionTitle}>Monthly Revenue (12 months)</h2>
        {data.monthlyRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.monthlyRevenue}>
              <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
              <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v / 1000}k`} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={formatRev} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revG)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.slate }}>No revenue data yet.</p>}
      </div>
      <div style={card}>
        <h2 style={sectionTitle}>ADR & RevPAR Trend</h2>
        {data.adrRevparTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.adrRevparTrend}>
              <defs>
                <linearGradient id="adrG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                <linearGradient id="revparG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
              <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="adr" stroke="#06b6d4" fill="url(#adrG)" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} name="ADR" />
              <Area type="monotone" dataKey="revpar" stroke="#8b5cf6" fill="url(#revparG)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="RevPAR" />
              <Legend formatter={(v) => <span style={{ color: colors.slate, fontSize: 12 }}>{v}</span>} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.slate }}>No ADR data yet.</p>}
      </div>
    </div>
  );

  const renderOccupancy = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={card}>
        <h2 style={sectionTitle}>Occupancy Rate Trend</h2>
        {data.occupancy.monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.occupancy.monthlyTrend}>
              <defs><linearGradient id="occG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
              <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={formatPct} />
              <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fill="url(#occG)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.slate }}>No occupancy data yet.</p>}
      </div>
      <div style={card}>
        <h2 style={sectionTitle}>Nights Sold vs Available</h2>
        {data.occupancy.monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.occupancy.monthlyTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
              <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="nightsSold" fill="#8b5cf6" name="Nights Sold" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="nightsAvailable" fill="rgba(139,92,246,0.2)" name="Nights Available" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Legend formatter={(v) => <span style={{ color: colors.slate, fontSize: 12 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.slate }}>No occupancy data yet.</p>}
      </div>
    </div>
  );

  const renderAdrRevpar = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={card}>
        <h2 style={sectionTitle}>Monthly ADR</h2>
        {data.adrRevparTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.adrRevparTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
              <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
               <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={formatAdr} />
              <Bar dataKey="adr" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.slate }}>No ADR data yet.</p>}
      </div>
      <div style={card}>
        <h2 style={sectionTitle}>Monthly RevPAR</h2>
        {data.adrRevparTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.adrRevparTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
              <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
               <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={formatCurr} />
              <Bar dataKey="revpar" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.slate }}>No RevPAR data yet.</p>}
      </div>
    </div>
  );

  const renderRevenue = () => (
    <div style={card}>
      <h2 style={sectionTitle}>Monthly Revenue (12 months)</h2>
      {data.monthlyRevenue.length > 0 ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data.monthlyRevenue}>
            <defs><linearGradient id="revG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
            <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatRev} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revG2)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : <p style={{ color: colors.slate }}>No revenue data yet.</p>}
    </div>
  );

  const renderExpenses = () => (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
            <th style={th}>Category</th><th style={th}>Count</th><th style={th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.expensesByCategory.map((e: any) => (
            <tr key={e.category} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
              <td style={td}>{e.category}</td>
              <td style={td}>{e.count}</td>
              <td style={{ ...td, fontWeight: 600, color: colors.danger }}>{f(e.total)}</td>
            </tr>
          ))}
          {data.expensesByCategory.length === 0 && (
            <tr><td colSpan={3} style={{ padding: 20, color: colors.slate, textAlign: 'center' }}>No expenses recorded.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderDemographics = () => {
    const gd = data.guestDemographics;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <h2 style={sectionTitle}>Booking Sources</h2>
          {gd.bookingsBySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={gd.bookingsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  label={({ source, percent }: any) => `${sourceLabels[source] || source} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {gd.bookingsBySource.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: colors.slate }}>No booking data yet.</p>}
        </div>

        <div style={card}>
          <h2 style={sectionTitle}>Guest Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ ...glass, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: colors.slate, marginBottom: 8 }}>Total Guests</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.dark }}>{gd.totalGuests}</div>
            </div>
            <div style={{ ...glass, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: colors.slate, marginBottom: 8 }}>Avg Stay (nights)</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.dark }}>{gd.avgLengthOfStay}</div>
            </div>
            <div style={{ ...glass, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: colors.slate, marginBottom: 8 }}>New Guests</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>{gd.newGuests}</div>
            </div>
            <div style={{ ...glass, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: colors.slate, marginBottom: 8 }}>Repeat Guests</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>{gd.repeatGuests}</div>
            </div>
          </div>
        </div>

        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h2 style={sectionTitle}>Booking Trend</h2>
          {gd.bookingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={gd.bookingTrend}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
                <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: colors.slate }}>No booking trend data yet.</p>}
        </div>

        {gd.topGuests.length > 0 && (
          <div style={{ ...card, gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
            <h2 style={{ ...sectionTitle, margin: 24, marginBottom: 0, padding: '0 0 16px 0' }}>Top Guests by Spend</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>Guest</th><th style={th}>Email</th><th style={th}>Bookings</th><th style={th}>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {gd.topGuests.map((g, i) => (
                  <tr key={g.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ ...td, fontWeight: 600 }}>{g.guest_name}</td>
                    <td style={td}>{g.email}</td>
                    <td style={td}>{g.booking_count}</td>
                    <td style={{ ...td, fontWeight: 600, color: colors.primary }}>{f(g.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ ...pageTitle, marginBottom: 0 }}>Reports</h1>
        <button onClick={handleExportCSV} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10,
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
          color: colors.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ ...glass, padding: 18, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: colors.slate, fontWeight: 500 }}>{c.label}</div>
              <div style={{ color: c.color, opacity: 0.6 }}>{c.icon}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 11, color: colors.slate, marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('overview')} style={tabBtn('overview')}>Overview</button>
        <button onClick={() => setTab('occupancy')} style={tabBtn('occupancy')}>Occupancy</button>
        <button onClick={() => setTab('adr')} style={tabBtn('adr')}>ADR / RevPAR</button>
        <button onClick={() => setTab('revenue')} style={tabBtn('revenue')}>Revenue</button>
        <button onClick={() => setTab('expenses')} style={tabBtn('expenses')}>Expenses</button>
        <button onClick={() => setTab('demographics')} style={tabBtn('demographics')}>Demographics</button>
      </div>

      {tab === 'overview' && renderOverview()}
      {tab === 'occupancy' && renderOccupancy()}
      {tab === 'adr' && renderAdrRevpar()}
      {tab === 'revenue' && renderRevenue()}
      {tab === 'expenses' && renderExpenses()}
      {tab === 'demographics' && renderDemographics()}
    </div>
  );
}

const th: React.CSSProperties = { padding: '12px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: colors.slate };
const td: React.CSSProperties = { padding: '10px 18px', fontSize: 14, color: colors.dark };
