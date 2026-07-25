import { Link } from 'react-router-dom';
import { colors } from '../styles';
import { Mail } from 'lucide-react';

export default function CheckEmail() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #111125 0%, #0a0a0f 70%)',
    }}>
      <div style={{
        background: 'rgba(18, 18, 30, 0.7)',
        backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: 44, width: 420, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(108, 99, 255, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Mail size={32} color={colors.primary} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          Check Your Email
        </h1>
        <p style={{ color: colors.slate, lineHeight: 1.6, marginBottom: 8 }}>
          We've sent a verification link to your email address.
        </p>
        <p style={{ color: colors.slate, lineHeight: 1.6, fontSize: 14, marginBottom: 32 }}>
          Click the link to activate your account, then sign in.
        </p>

        <Link to="/login" style={{
          display: 'inline-block', padding: '12px 36px', borderRadius: 10, textDecoration: 'none',
          background: `linear-gradient(135deg, ${colors.primary}, #2563eb)`,
          color: '#fff', fontSize: 16, fontWeight: 600,
          boxShadow: `0 4px 20px ${colors.primaryGlow}`,
        }}>
          Go to Sign In
        </Link>
      </div>
    </div>
  );
}
