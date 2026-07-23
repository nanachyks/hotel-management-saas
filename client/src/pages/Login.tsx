import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, input } from '../styles';
import { Mail } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setResent(false);
    setBusy(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(err.email || '');
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      setResent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #111125 0%, #0a0a0f 70%)',
    }}>
      <div style={{
        background: 'rgba(18, 18, 30, 0.7)',
        backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: 44, width: 400, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div data-testid="brand-name" style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
            <span style={{ color: colors.primary }}>H</span>otel<span style={{ color: colors.primary }}>E</span>ase
          </div>
        </div>
        <p style={{ fontSize: 16, color: colors.slate, marginBottom: 32, textAlign: 'center' }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', color: colors.danger,
            padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16,
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            {error}
          </div>
        )}

        {needsVerification && (
          <div style={{
            background: 'rgba(108, 99, 255, 0.1)', color: colors.slate,
            padding: '16px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16,
            border: '1px solid rgba(108, 99, 255, 0.2)',
          }}>
            <p style={{ color: '#fff', margin: '0 0 12px', fontWeight: 600 }}>
              Please verify your email before signing in.
            </p>
            {resent ? (
              <p style={{ color: '#22c55e', margin: 0, fontSize: 13 }}>
                Verification email resent! Check your inbox.
              </p>
            ) : (
              <button onClick={resendVerification} disabled={resending} style={{
                background: 'none', border: 'none', color: colors.primary, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Mail size={14} />
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username" required autoFocus
              style={{ ...input, width: '100%' }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; }}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password" required
              style={{ ...input, width: '100%' }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; }}
            />
          </div>
          <button type="submit" disabled={busy} style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: busy ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff', fontSize: 16, fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : `0 4px 20px ${colors.primaryGlow}`,
            transition: 'all 0.2s ease',
          }}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: colors.slate }}>
          <Link to="/forgot-password" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            Forgot password?
          </Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 15, color: colors.slate }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
