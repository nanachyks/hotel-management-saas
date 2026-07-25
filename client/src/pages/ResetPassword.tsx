import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { colors, input, btn } from '../styles';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
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
          <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
            <span style={{ color: colors.primary }}>H</span>otel<span style={{ color: colors.primary }}>E</span>ase
          </div>
        </div>
        <p style={{ fontSize: 16, color: colors.slate, marginBottom: 32, textAlign: 'center' }}>
          Enter your reset token and new password
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>Reset Token</label>
            <input
              type="text" value={token} onChange={e => setToken(e.target.value)}
              placeholder="Paste your reset token" required autoFocus
              style={{ ...input, width: '100%' }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>New Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters" required minLength={8}
              style={{ ...input, width: '100%' }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; }}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>Confirm Password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password" required minLength={8}
              style={{ ...input, width: '100%' }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; }}
            />
          </div>
          <button type="submit" disabled={busy} style={{
            ...btn, width: '100%', padding: '12px', fontSize: 16,
            opacity: busy ? 0.6 : 1,
          }}>
            {busy ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 15, color: colors.slate }}>
          <Link to="/login" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
