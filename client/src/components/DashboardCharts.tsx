import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { colors, glass, formatCurrency } from '../styles';

interface ChartData {
  revenueTrend: { month: string; revenue: number }[];
  bookingTrend: { month: string; count: number }[];
  roomStatus: { status: string; count: number }[];
  monthlyOccupancy: { month: string; rate: number }[];
}

const chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const tooltipStyle = {
  background: 'rgba(18,18,30,0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 13,
};

const formatRevenue = (v: number | string) => [formatCurrency(Number(v)), 'Revenue'] as any;
const formatOcc = (v: number | string) => [`${v}%`, 'Occupancy'] as any;

export function RevenueChart({ data }: { data: ChartData['revenueTrend'] }) {
  return (
    <div style={{ ...glass, padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
          <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `GHS ${v}`} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={formatRevenue as any} />
          <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BookingChart({ data }: { data: ChartData['bookingTrend'] }) {
  return (
    <div style={{ ...glass, padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Booking Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
          <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const pieLabel = ({ status, percent }: { status?: string; percent?: number }) =>
  `${status} (${((percent || 0) * 100).toFixed(0)}%)`;

export function RoomStatusChart({ data }: { data: ChartData['roomStatus'] }) {
  return (
    <div style={{ ...glass, padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Room Status</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
            label={pieLabel} labelLine={false}
          >
            {data.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend formatter={(value) => <span style={{ color: colors.slate, fontSize: 12 }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OccupancyChart({ data }: { data: ChartData['monthlyOccupancy'] }) {
  return (
    <div style={{ ...glass, padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Occupancy Rate</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
          <XAxis dataKey="month" tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} tick={{ fill: colors.slate, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={formatOcc as any} />
          <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fill="url(#occGrad)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
