import { useNavigate } from 'react-router-dom';
import { btn, card, colors } from '../styles';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg }}>
      <div style={{ ...card, textAlign: 'center', padding: '60px 40px', maxWidth: 480 }}>
        <div style={{ fontSize: 80, fontWeight: 800, color: colors.primary, lineHeight: 1, marginBottom: 8 }}>404</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: colors.dark, marginBottom: 12 }}>Page Not Found</div>
        <p style={{ color: colors.slate, marginBottom: 28, lineHeight: 1.6 }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        <button onClick={() => navigate('/dashboard')} style={{ ...btn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Home size={18} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
