import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { colors } from '../styles';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json().catch(() => ({ error: 'Failed to connect to server' })))
      .then(data => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to connect to server.');
      });
  }, [searchParams]);

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
        {status === 'loading' && (
          <>
            <Loader2 size={48} color={colors.primary} style={{ marginBottom: 24 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              Verifying your email...
            </h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} color="#22c55e" style={{ marginBottom: 24 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              Email Verified!
            </h1>
            <p style={{ color: colors.slate, marginBottom: 32 }}>{message}</p>
            <Link to="/login" style={{
              display: 'inline-block', padding: '12px 36px', borderRadius: 10, textDecoration: 'none',
              background: `linear-gradient(135deg, ${colors.primary}, #2563eb)`,
              color: '#fff', fontSize: 16, fontWeight: 600,
              boxShadow: `0 4px 20px ${colors.primaryGlow}`,
            }}>
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} color="#ef4444" style={{ marginBottom: 24 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              Verification Failed
            </h1>
            <p style={{ color: colors.slate, marginBottom: 8 }}>{message}</p>
            <p style={{ color: colors.slate, fontSize: 14, marginBottom: 32 }}>
              Request a new verification link from the sign in page.
            </p>
            <Link to="/login" style={{
              display: 'inline-block', padding: '12px 36px', borderRadius: 10, textDecoration: 'none',
              background: `linear-gradient(135deg, ${colors.primary}, #2563eb)`,
              color: '#fff', fontSize: 16, fontWeight: 600,
              boxShadow: `0 4px 20px ${colors.primaryGlow}`,
            }}>
              Go to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
