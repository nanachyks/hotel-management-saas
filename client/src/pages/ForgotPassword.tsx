import { useState } from 'react';
import { Link } from 'react-router-dom';
import { colors, input, btn } from '../styles';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message);
      if (data.resetToken) setResetToken(data.resetToken);
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
          Reset your password
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

        {message && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)', color: colors.success,
            padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16,
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}>
            {message}
          </div>
        )}

        {resetToken && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)', color: colors.primary,
            padding: '14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            wordBreak: 'break-all',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Reset Token:</div>
            {resetToken}
            <div style={{ marginTop: 8, fontSize: 13, color: colors.slate }}>
              Copy this token and go to the <Link to="/reset-password" style={{ color: colors.primary }}>reset password</Link> page.
            </div>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email" required autoFocus
                style={{ ...input, width: '100%' }}
                onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; }}
                onBlur={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; }}
              />
            </div>
            <button type="submit" disabled={busy} style={{
              ...btn, width: '100%', padding: '12px', fontSize: 16,
              opacity: busy ? 0.6 : 1,
            }}>
              {busy ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 15, color: colors.slate }}>
          <Link to="/login" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
