import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { colors, card } from '../styles';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found.');
      return;
    }

    api.post<{ success: boolean; message: string }>('/subscriptions/verify-payment', { reference })
      .then(res => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message);
        } else {
          setStatus('failed');
          setMessage(res.message || 'Payment verification failed.');
        }
      })
      .catch((err) => {
        setStatus('failed');
        setMessage(err.message || 'Verification request failed.');
      });
  }, [searchParams]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: colors.bg }}>
      <div style={{ ...card, padding: 48, maxWidth: 480, textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: colors.primary, marginBottom: 20 }} />
            <h2 style={{ color: colors.dark, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verifying Payment</h2>
            <p style={{ color: colors.slate, fontSize: 15 }}>Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} color={colors.success} style={{ marginBottom: 20 }} />
            <h2 style={{ color: colors.success, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment Successful!</h2>
            <p style={{ color: colors.slate, fontSize: 15, marginBottom: 24 }}>{message}</p>
            <button onClick={() => navigate('/subscriptions')} style={{
              padding: '12px 32px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
            }}>Back to Subscriptions</button>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle size={48} color={colors.danger} style={{ marginBottom: 20 }} />
            <h2 style={{ color: colors.danger, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment Failed</h2>
            <p style={{ color: colors.slate, fontSize: 15, marginBottom: 24 }}>{message}</p>
            <button onClick={() => navigate('/subscriptions')} style={{
              padding: '12px 32px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
              background: 'transparent', color: colors.danger, cursor: 'pointer', fontWeight: 600, fontSize: 15,
            }}>Try Again</button>
          </>
        )}
      </div>
    </div>
  );
}
