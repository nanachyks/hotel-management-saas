import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, card, btn, btnSm } from '../styles';
import { Lock, CreditCard, LogOut } from 'lucide-react';

// Shown to anyone whose hotel's subscription/trial has lapsed (API 402 gate).
// Admins get a direct path to renew; everyone else is told who can fix it.
export default function Locked() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, padding: 16 }}>
      <div style={{ ...card, textAlign: 'center', padding: '48px 36px', maxWidth: 480 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)',
        }}>
          <Lock size={34} color={colors.warning} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.dark, marginBottom: 10 }}>Your subscription has ended</div>
        <p style={{ color: colors.slate, lineHeight: 1.6, marginBottom: 28 }}>
          {isAdmin
            ? 'Your free trial or subscription period is over, so the hotel tools are locked. Choose a plan to get everything back on — your rooms, bookings and reports are all waiting.'
            : 'The subscription for your property has expired. Ask your administrator or the account manager to renew the subscription — then sign in again and everything will be right here.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAdmin && (
            <Link to="/subscriptions" style={{ ...btn, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <CreditCard size={18} /> Renew subscription
            </Link>
          )}
          <button onClick={() => { logout(); navigate('/login'); }} style={{ ...btnSm, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
