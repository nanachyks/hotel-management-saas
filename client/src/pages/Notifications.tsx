import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { pageTitle, card, sectionTitle, btnSm, colors, glass } from '../styles';
import { Bell, CheckCheck, CalendarDays, Wrench, Sparkles, ConciergeBell, DollarSign, DoorOpen, X } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  booking: <CalendarDays size={16} />,
  check_in: <DoorOpen size={16} />,
  check_out: <DoorOpen size={16} />,
  cancellation: <X size={16} />,
  maintenance: <Wrench size={16} />,
  housekeeping: <Sparkles size={16} />,
  room_service: <ConciergeBell size={16} />,
  payment: <DollarSign size={16} />,
};

export default function Notifications() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: { id: string; link: string; read: number }) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={pageTitle}>Notifications</h1>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <Bell size={40} style={{ color: colors.slate, marginBottom: 16, opacity: 0.4 }} />
          <p style={{ color: colors.slate, fontSize: 16 }}>No notifications yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div key={n.id} onClick={() => handleClick(n)} style={{
              ...glass, padding: '16px 20px', cursor: 'pointer',
              borderLeft: `3px solid ${n.read ? 'transparent' : colors.primary}`,
              background: n.read ? colors.card : 'rgba(59,130,246,0.06)',
              transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 14,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.cardHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = n.read ? colors.card : 'rgba(59,130,246,0.06)'; }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: n.read ? colors.input : 'rgba(59,130,246,0.15)', color: n.read ? colors.slate : colors.primary,
              }}>
                {typeIcons[n.type] || <Bell size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: n.read ? colors.slate : colors.dark, marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 14, color: colors.slate, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                <div style={{ fontSize: 12, color: colors.slate, marginTop: 4, opacity: 0.6 }}>
                  {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.primary, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
