import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { colors, input } from '../styles';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', hotel_name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      navigate('/check-email');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = colors.inputFocus; };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.input; };

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
        <p style={{ fontSize: 16, color: colors.slate, marginBottom: 32, textAlign: 'center' }}>Create your account</p>

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
          {[
            { label: 'Full Name', key: 'name' as const, type: 'text', placeholder: 'John Doe' },
            { label: 'Hotel Name', key: 'hotel_name' as const, type: 'text', placeholder: 'Your Hotel Name' },
            { label: 'Email', key: 'email' as const, type: 'email', placeholder: 'john@example.com' },
            { label: 'Username', key: 'username' as const, type: 'text', placeholder: 'Choose a username' },
            { label: 'Password', key: 'password' as const, type: 'password', placeholder: 'Create a password', minLength: 8 },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: field.key === 'password' ? 28 : 20 }}>
              <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.darker, marginBottom: 8 }}>{field.label}</label>
              <input
                type={field.type} value={form[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder} required
                minLength={field.minLength}
                autoFocus={field.key === 'name'}
                style={{ ...input, width: '100%' }}
                onFocus={inputFocus} onBlur={inputBlur}
              />
            </div>
          ))}
          <button type="submit" disabled={busy} style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: busy ? 'var(--color-primary-glow, rgba(59,130,246,0.3))' : `linear-gradient(135deg, ${colors.primary}, #2563eb)`,
            color: '#fff', fontSize: 16, fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : `0 4px 20px ${colors.primaryGlow}`,
            transition: 'all 0.2s ease',
          }}>
            {busy ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 15, color: colors.slate }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
