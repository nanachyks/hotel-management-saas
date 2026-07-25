import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import { colors, scrollbarStyle, globalStyle } from '../styles';
import {
  LayoutDashboard, CalendarDays, DoorOpen, CalendarCheck,
  Users, Receipt, ConciergeBell, UserCog, Building2,
  BarChart3, Wallet, Sparkles, Wrench, Bell, UsersRound,   BellRing,   Crown, Package, Brain, DollarSign, Plug,
  Briefcase, GitBranch, Shield, Key, Paintbrush, Globe, Radio,
} from 'lucide-react';

  const iconMap: Record<string, React.ReactNode> = {
    Subscriptions: <Crown size={18} />,
  Dashboard: <LayoutDashboard size={18} />,
  Calendar: <CalendarDays size={18} />,
  Rooms: <DoorOpen size={18} />,
  'Room Types': <DoorOpen size={18} />,
  Bookings: <CalendarCheck size={18} />,
  Guests: <Users size={18} />,
  Invoices: <Receipt size={18} />,
  Services: <ConciergeBell size={18} />,
  Users: <UserCog size={18} />,
  'Hotel Setup': <Building2 size={18} />,
  Expenses: <Wallet size={18} />,
  Reports: <BarChart3 size={18} />,
  Housekeeping: <Sparkles size={18} />,
  Maintenance: <Wrench size={18} />,
  'Room Service': <ConciergeBell size={18} />,
  Staff: <UsersRound size={18} />,
  Inventory: <Package size={18} />,
  'AI Insights': <Brain size={18} />,
  Payroll: <DollarSign size={18} />,
  Integrations: <Plug size={18} />,
  'Corporate': <Briefcase size={18} />,
  'Franchise': <GitBranch size={18} />,
  'Roles': <Shield size={18} />,
  'API Keys': <Key size={18} />,
  'White Label': <Paintbrush size={18} />,
  'Enterprise': <Globe size={18} />,
  'Channels': <Radio size={18} />,
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { primaryColor, setPrimaryColor } = useBrand();
  const { unread, notifications, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<{ id: string; name: string; member_role: string }[]>([]);
  const [currentHotel, setCurrentHotel] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    api.get('/hotels/mine').then((list: any) => {
      setHotels(list || []);
      const active = (list || []).find((h: any) => h.id === user?.hotel_id);
      if (active) setCurrentHotel(active);
      else if (list?.length) setCurrentHotel(list[0]);
    }).catch(() => {});
  }, [user]);

  const role = user?.role || '';
  const canManage = role === 'admin' || role === 'owner';
  const canViewFinance = role === 'admin' || role === 'owner' || role === 'manager' || role === 'accountant';
  const canViewServices = role === 'admin' || role === 'owner' || role === 'manager';
  const canViewGuests = role === 'admin' || role === 'owner' || role === 'manager' || role === 'receptionist';
  const canViewOperations = role === 'admin' || role === 'owner' || role === 'manager' || role === 'housekeeping';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/ai', label: 'AI Insights' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/rooms', label: 'Rooms' },
    ...(canManage ? [{ to: '/room-types' as const, label: 'Room Types' }] : []),
    { to: '/bookings', label: 'Bookings' },
    ...(canViewGuests ? [{ to: '/guests' as const, label: 'Guests' }] : []),
    ...(canViewFinance ? [{ to: '/invoices' as const, label: 'Invoices' }] : []),
    ...(canViewFinance ? [{ to: '/expenses' as const, label: 'Expenses' }] : []),
    ...(canViewFinance ? [{ to: '/inventory' as const, label: 'Inventory' }] : []),
    ...(canViewFinance ? [{ to: '/payroll' as const, label: 'Payroll' }] : []),
    ...(canViewFinance ? [{ to: '/reports' as const, label: 'Reports' }] : []),
    ...(canViewServices ? [{ to: '/services' as const, label: 'Services' }] : []),
    ...(canViewOperations ? [{ to: '/housekeeping' as const, label: 'Housekeeping' }] : []),
    ...(canViewOperations ? [{ to: '/maintenance' as const, label: 'Maintenance' }] : []),
    ...(canViewOperations ? [{ to: '/room-service' as const, label: 'Room Service' }] : []),
    ...(canViewOperations ? [{ to: '/staff' as const, label: 'Staff' }] : []),
    ...(canManage ? [{ to: '/integrations' as const, label: 'Integrations' }] : []),
    ...(canManage ? [{ to: '/users' as const, label: 'Users' }] : []),
    ...(canManage ? [{ to: '/subscriptions' as const, label: 'Subscriptions' }] : []),
    ...(canManage ? [{ to: '/hotel' as const, label: 'Hotel Setup' }] : []),
    ...(canManage ? [{ to: '/corporate' as const, label: 'Corporate' }] : []),
    ...(canManage ? [{ to: '/franchise' as const, label: 'Franchise' }] : []),
    ...(canManage ? [{ to: '/roles' as const, label: 'Roles' }] : []),
    ...(canManage ? [{ to: '/api-keys' as const, label: 'API Keys' }] : []),
    ...(canManage ? [{ to: '/white-label' as const, label: 'White Label' }] : []),
    ...(canManage ? [{ to: '/enterprise' as const, label: 'Enterprise' }] : []),
    ...(canManage ? [{ to: '/channels' as const, label: 'Channels' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotifClick = (n: { id: string; link: string; read: number }) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  const navWidth = expanded ? 240 : 64;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: `radial-gradient(ellipse at 20% 50%, #111125 0%, ${colors.bg} 70%)`,
      color: colors.dark,
    }}>
      <style>{globalStyle}{scrollbarStyle}{`
        @keyframes badgePulse { 0%, 100% { transform: translateY(-50%) scale(1); } 50% { transform: translateY(-50%) scale(1.15); } }
      `}</style>

      <nav
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: navWidth, display: 'flex', flexDirection: 'column',
          background: colors.nav,
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRight: `1px solid ${colors.border}`,
          padding: '24px 0', zIndex: 10,
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
        <div data-testid="brand-name" style={{ padding: expanded ? '0 24px 24px' : '0 0 24px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: expanded ? undefined : 'center', gap: 2 }}>
          <span style={{ color: colors.primary }}>H</span>
          {expanded && <span>otel<span style={{ color: colors.primary }}>E</span>ase</span>}
        </div>
        {currentHotel && expanded && (
          <div style={{ padding: '0 24px 24px', fontSize: 13, color: colors.slate }}>
            <div style={{ fontWeight: 500, color: '#94a3b8' }}>{currentHotel.name}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, padding: '0 14px' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', justifyContent: expanded ? undefined : 'center',
                gap: expanded ? 12 : 0,
                padding: expanded ? '12px 14px' : '12px 0',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#fff' : colors.slate,
                background: isActive ? 'var(--color-primary-012, rgba(59,130,246,0.12))' : 'transparent',
                border: isActive ? '1px solid var(--color-primary-02, rgba(59,130,246,0.2))' : '1px solid transparent',
                fontSize: 16, fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s ease',
              })}
            >
              {iconMap[item.label]}
              {expanded && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        <div style={{ padding: expanded ? '20px 22px' : '20px 12px', borderTop: `1px solid ${colors.border}`, marginTop: 'auto' }}>
          <NavLink to="/notifications" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: expanded ? undefined : 'center',
              gap: expanded ? 12 : 0,
              padding: expanded ? '10px 14px' : '10px 0',
              borderRadius: 10, marginBottom: 8,
              cursor: 'pointer', fontSize: 15, fontWeight: 500, color: colors.slate,
              transition: 'all 0.15s ease', position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.slate; }}>
              <BellRing size={18} />
              {expanded && <span>Notifications</span>}
              {unread > 0 && (
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: colors.danger, color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999, minWidth: 20, textAlign: 'center',
                  animation: 'badgePulse 2s ease-in-out infinite',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </NavLink>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, justifyContent: expanded ? 'flex-start' : 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, var(--color-primary, #3b82f6), #8b5cf6)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {expanded && (
              <div>
                <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.2 }}>{user?.name}</div>
                <div style={{ fontSize: 13, color: colors.slate, textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            )}
          </div>
          {expanded && (
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 11, color: colors.slate, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand Color</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['#3b82f6', '#7c3aed', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#475569', '#0ea5e9'].map(color => (
                  <button key={color} onClick={() => setPrimaryColor(color)} title={color}
                    style={{
                      width: 24, height: 24, borderRadius: 6, border: primaryColor === color ? '2px solid #fff' : `2px solid transparent`,
                      background: color, cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: primaryColor === color ? `0 0 8px ${color}80` : 'none',
                    }} />
                ))}
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            padding: '7px 14px', borderRadius: 8,
            border: `1px solid ${colors.border}`,
            background: 'rgba(255,255,255,0.04)',
            color: colors.slate, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', width: '100%',
            transition: 'all 0.15s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = colors.slate; }}
          >
            {expanded ? 'Sign Out' : '✕'}
          </button>
        </div>
      </nav>

      <main style={{
        flex: 1, padding: 40, overflowY: 'auto',
        background: 'transparent',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
