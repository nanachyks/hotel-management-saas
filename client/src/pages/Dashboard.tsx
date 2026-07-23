import { useEffect, useState } from 'react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useCurrency } from '../context/CurrencyContext';
import { pageTitle, tableHeader as th, tableCell as td, colors, formatCurrency, glass, card } from '../styles';
import {
  Building2, CheckCircle2, CircleAlert, TrendingUp,
  CalendarCheck, LogIn, LogOut, DollarSign, CreditCard, AlertTriangle,
} from 'lucide-react';
import { RevenueChart, BookingChart, RoomStatusChart, OccupancyChart } from '../components/DashboardCharts';

interface ChartData {
  revenueTrend: { month: string; revenue: number }[];
  bookingTrend: { month: string; count: number }[];
  roomStatus: { status: string; count: number }[];
  monthlyOccupancy: { month: string; rate: number }[];
}

interface DashboardData {
  totalRooms: number; availableRooms: number; occupiedRooms: number; maintenanceRooms: number;
  occupancyRate: number; checkInsToday: number; checkOutsToday: number; activeBookings: number;
  totalRevenue: number; totalExpenses: number; taxCollected: number; pendingPayments: number; recentBookings: any[];
  charts: ChartData;
}

const cardIcons: Record<string, React.ReactNode> = {
  'Total Rooms': <Building2 size={20} />,
  'Available': <CheckCircle2 size={20} />,
  'Occupied': <CircleAlert size={20} />,
  'Occupancy': <TrendingUp size={20} />,
  'Active Bookings': <CalendarCheck size={20} />,
  'Check-ins Today': <LogIn size={20} />,
  'Check-outs Today': <LogOut size={20} />,
  'Revenue': <DollarSign size={20} />,
  'Pending Payments': <CreditCard size={20} />,
};

export default function Dashboard() {
  const { f, displayCurrency, setDisplayCurrency, currencies } = useCurrency();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, color: colors.slate }}>
      <AlertTriangle size={48} color={colors.warning} />
      <div style={{ fontSize: 18, fontWeight: 600 }}>Failed to load dashboard</div>
      <div style={{ fontSize: 14 }}>{error}</div>
    </div>
  );

  if (!data) return <LoadingSkeleton rows={8} count={2} />;

  const cards = [
    { label: 'Total Rooms', value: data.totalRooms, color: '#3b82f6' },
    { label: 'Available', value: data.availableRooms, color: '#22c55e' },
    { label: 'Occupied', value: data.occupiedRooms, color: '#f59e0b' },
    { label: 'Occupancy', value: `${data.occupancyRate}%`, color: '#8b5cf6' },
    { label: 'Active Bookings', value: data.activeBookings, color: '#06b6d4' },
    { label: 'Check-ins Today', value: data.checkInsToday, color: '#22c55e' },
    { label: 'Check-outs Today', value: data.checkOutsToday, color: '#f97316' },
    { label: 'Revenue', value: f(data.totalRevenue), color: '#10b981' },
    { label: 'Expenses', value: f(data.totalExpenses), color: '#ef4444' },
    { label: 'Tax Collected', value: f(data.taxCollected), color: '#8b5cf6' },
    { label: 'Pending Payments', value: f(data.pendingPayments), color: '#f59e0b' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: colors.slate }}>Currency:</span>
          <select value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: `1px solid ${colors.border}`,
              fontSize: 14, fontWeight: 600,
              background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
              outline: 'none', cursor: 'pointer',
            }}>
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            ...glass, padding: 24,
            borderLeft: `3px solid ${c.color}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${c.color}15`,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${c.color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${c.color}15`; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 15, color: colors.slate, fontWeight: 500, lineHeight: 1.3 }}>{c.label}</div>
              <div style={{ color: c.color, opacity: 0.6 }}>{cardIcons[c.label]}</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: c.color, textShadow: `0 0 20px ${c.color}40` }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        <RevenueChart data={data.charts.revenueTrend} />
        <BookingChart data={data.charts.bookingTrend} />
        <RoomStatusChart data={data.charts.roomStatus} />
        <OccupancyChart data={data.charts.monthlyOccupancy} />
      </div>

      {data.recentBookings.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Recent Bookings</h2>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>Guest</th><th style={th}>Room</th><th style={th}>Check-in</th><th style={th}>Check-out</th><th style={th}>Status</th><th style={th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={td}>{b.guest_name}</td>
                    <td style={td}>{b.room_number}</td>
                    <td style={td}>{b.check_in_date}</td>
                    <td style={td}>{b.check_out_date}</td>
                    <td style={td}><StatusBadge status={b.status} /></td>
                    <td style={td}>{f(b.total_amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export { };
