import { colors, card } from '../styles';

interface SkeletonProps {
  type?: 'table' | 'card' | 'text';
  rows?: number;
  count?: number;
}

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 6,
};

export default function LoadingSkeleton({ type = 'table', rows = 5, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {items.map((_, i) => (
          <div key={i} style={{ ...card, padding: 20 }}>
            <div style={{ ...shimmer, width: '60%', height: 14, marginBottom: 12 }} />
            <div style={{ ...shimmer, width: '80%', height: 24, marginBottom: 8 }} />
            <div style={{ ...shimmer, width: '40%', height: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((_, i) => (
          <div key={i} style={{ ...shimmer, width: `${60 + Math.random() * 30}%`, height: 14 }} />
        ))}
      </div>
    );
  }

  const cols = 6;
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ padding: '14px 18px' }}><div style={{ ...shimmer, width: '70%', height: 12 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} style={{ padding: '14px 18px' }}>
                  <div style={{ ...shimmer, width: `${50 + Math.random() * 40}%`, height: 14 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
