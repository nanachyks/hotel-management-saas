import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatCurrency, colors, card, pageTitle, btnSm, select } from '../styles';
import { CalendarDays, CalendarRange, Calendar } from 'lucide-react';

interface DayInfo {
  status: 'available' | 'booked' | 'maintenance';
  booking_id?: string;
  guest_name?: string;
  booking_status?: string;
}

interface RoomCal {
  id: string; room_number: string; room_type_name: string; base_price: number; floor: number;
  days: Record<string, DayInfo>;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function RoomCalendar() {
  const navigate = useNavigate();
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());
  const [data, setData] = useState<{ dates: string[]; rooms: RoomCal[] } | null>(null);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const getDateRange = () => {
    if (viewMode === 'daily') {
      const d = new Date(year, month, day);
      return { from: fmt(d), to: fmt(d) };
    }
    if (viewMode === 'weekly') {
      const start = new Date(year, month, day);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: fmt(start), to: fmt(end) };
    }
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return { from, to };
  };

  const load = () => {
    const { from, to } = getDateRange();
    api.get<{ dates: string[]; rooms: RoomCal[] }>(`/rooms/availability?from=${from}&to=${to}`).then(setData);
  };

  useEffect(() => { load(); }, [year, month, day, viewMode]);

  const navigatePrev = () => {
    if (viewMode === 'daily') {
      const d = new Date(year, month, day);
      d.setDate(d.getDate() - 1);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    } else if (viewMode === 'weekly') {
      const d = new Date(year, month, day);
      d.setDate(d.getDate() - 7);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    } else {
      if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); }
    }
  };

  const navigateNext = () => {
    if (viewMode === 'daily') {
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + 1);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    } else if (viewMode === 'weekly') {
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + 7);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    } else {
      if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); }
    }
  };

  const headerLabel = () => {
    if (viewMode === 'daily') {
      return new Date(year, month, day).toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (viewMode === 'weekly') {
      const start = new Date(year, month, day);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleString('default', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()} - ${end.toLocaleString('default', { month: 'short' })} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cellColors: Record<string, string> = { available: '#22c55e', booked: '#f59e0b', maintenance: '#ef4444' };

  const cellStyle = (status: string, date: string): React.CSSProperties => {
    const isToday = date === fmt(today);
    return {
      width: viewMode === 'monthly' ? 36 : 44, height: viewMode === 'monthly' ? 36 : 44, fontSize: 13, borderRadius: 6, cursor: 'pointer',
      background: cellColors[status] || colors.input,
      border: isToday ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 10px ${cellColors[status] || 'transparent'}20`,
      transition: 'transform 0.1s ease',
    };
  };

  const handleCellClick = (roomId: string, date: string, dayInfo: DayInfo) => {
    if (dayInfo.status === 'booked' && dayInfo.booking_id) {
      navigate(`/bookings/${dayInfo.booking_id}`);
    } else if (dayInfo.status === 'available') {
      const checkOutDate = new Date(date);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      navigate(`/bookings?room=${roomId}&checkIn=${date}&checkOut=${checkOutDate.toISOString().split('T')[0]}`);
    }
  };

  const dates: string[] = data?.dates || [];
  const rooms: RoomCal[] = data?.rooms || [];

  const isToday = (d: string) => d === fmt(today);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderDailyView = () => (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: colors.slate }}>Room</th>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: colors.slate }}>Status</th>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: colors.slate }}>Guest</th>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: colors.slate }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => {
            const dayInfo = room.days[dates[0]] || { status: 'available' };
            return (
              <tr key={room.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 18px', fontWeight: 600, color: colors.dark }}>#{room.room_number} <span style={{ fontWeight: 400, color: colors.slate, fontSize: 13 }}>{room.room_type_name}</span></td>
                <td style={{ padding: '10px 18px' }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: `${cellColors[dayInfo.status]}20`, color: cellColors[dayInfo.status] }}>
                    {dayInfo.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px 18px', color: colors.dark }}>{dayInfo.status === 'booked' ? dayInfo.guest_name : '-'}</td>
                <td style={{ padding: '10px 18px', color: colors.primary, fontWeight: 600 }}>{formatCurrency(room.base_price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderWeeklyView = () => {
    const start = new Date(year, month, day);
    start.setDate(start.getDate() - start.getDay());
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      weekDates.push(fmt(d));
    }

    return (
      <div style={{ ...card, padding: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', borderBottom: `2px solid ${colors.border}`, background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0 }}>
          <div style={{ minWidth: 160, padding: '12px 18px', fontWeight: 600, fontSize: 13, color: colors.slate, borderRight: `1px solid ${colors.border}` }}>Room</div>
          <div style={{ display: 'flex', gap: 4, padding: '8px 10px' }}>
            {weekDates.map(d => (
              <div key={d} style={{ width: 52, textAlign: 'center', fontSize: 12, fontWeight: isToday(d) ? 700 : 600, color: isToday(d) ? colors.primary : colors.slate }}>
                <div>{dayNames[new Date(d).getDay()]}</div>
                <div style={{ fontSize: 16 }}>{new Date(d).getDate()}</div>
              </div>
            ))}
          </div>
        </div>
        {rooms.map(room => (
          <div key={room.id} style={{ display: 'flex', borderBottom: `1px solid ${colors.borderLight}` }}>
            <div style={{ minWidth: 160, padding: '8px 16px', borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.dark }}>#{room.room_number}</div>
              <div style={{ fontSize: 12, color: colors.slate }}>{room.room_type_name}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', alignItems: 'center' }}>
              {weekDates.map(date => {
                const dayInfo = room.days[date] || { status: 'available' as const };
                return (
                  <div key={date}
                    style={{ width: 52, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', background: cellColors[dayInfo.status] || colors.input, border: isToday(date) ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, transition: 'transform 0.1s ease' }}
                    onClick={() => handleCellClick(room.id, date, dayInfo)}
                    title={dayInfo.status === 'booked' ? `${dayInfo.guest_name} (${dayInfo.booking_status})` : dayInfo.status}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMonthlyView = () => (
    <div style={{ ...card, padding: 0, overflow: 'auto' }}>
      <div style={{ display: 'flex', borderBottom: `2px solid ${colors.border}`, background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0 }}>
        <div style={{ minWidth: 180, padding: '12px 18px', fontWeight: 600, fontSize: 13, color: colors.slate, borderRight: `1px solid ${colors.border}` }}>Room</div>
        <div style={{ display: 'flex', gap: 2, padding: '6px 8px' }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} style={{ width: 36, height: 36 }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <div key={d} style={{ width: 36, height: 36, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: colors.slate }}>
              {d}
            </div>
          ))}
        </div>
      </div>
      {rooms.map(room => (
        <div key={room.id} style={{ display: 'flex', borderBottom: `1px solid ${colors.borderLight}` }}>
          <div style={{ minWidth: 180, padding: '8px 16px', borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.dark }}>#{room.room_number}</div>
            <div style={{ fontSize: 13, color: colors.slate }}>{room.room_type_name} - {formatCurrency(room.base_price)}</div>
          </div>
          <div style={{ display: 'flex', gap: 2, padding: '6px 8px', alignItems: 'center' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`fe-${i}`} style={{ width: 36, height: 36 }} />)}
            {dates.map(date => {
              const dayInfo = room.days[date] || { status: 'available' as const };
              return (
                <div key={date}
                  style={cellStyle(dayInfo.status, date)}
                  onClick={() => handleCellClick(room.id, date, dayInfo)}
                  title={dayInfo.status === 'booked' ? `${dayInfo.guest_name} (${dayInfo.booking_status})` : dayInfo.status}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Room Calendar</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setViewMode('daily')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'daily' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'daily' ? '#fff' : colors.slate }}><Calendar size={16} /></button>
            <button onClick={() => setViewMode('weekly')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'weekly' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'weekly' ? '#fff' : colors.slate }}><CalendarRange size={16} /></button>
            <button onClick={() => setViewMode('monthly')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'monthly' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'monthly' ? '#fff' : colors.slate }}><CalendarDays size={16} /></button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={navigatePrev} style={navBtn}>&larr;</button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 280, textAlign: 'center', color: colors.dark }}>{headerLabel()}</span>
          <button onClick={navigateNext} style={navBtn}>&rarr;</button>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 14, color: colors.slate }}>
          {Object.entries({ available: 'Available', booked: 'Booked', maintenance: 'Maintenance' }).map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: cellColors[key] }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {data && (viewMode === 'daily' ? renderDailyView() : viewMode === 'weekly' ? renderWeeklyView() : renderMonthlyView())}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: `1px solid ${colors.border}`,
  background: colors.input, fontSize: 16, cursor: 'pointer', color: colors.dark, lineHeight: 1,
  transition: 'all 0.15s ease',
};
