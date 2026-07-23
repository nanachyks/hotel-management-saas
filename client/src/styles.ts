import { CSSProperties } from 'react';

export const colors = {
  primary: '#3b82f6',
  primaryGlow: 'rgba(59, 130, 246, 0.3)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  slate: '#94a3b8',
  dark: '#f1f5f9',
  darker: '#cbd5e1',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  bg: '#0a0a0f',
  card: 'rgba(18, 18, 30, 0.7)',
  cardHover: 'rgba(25, 25, 40, 0.8)',
  nav: 'rgba(10, 10, 18, 0.85)',
  input: 'rgba(255, 255, 255, 0.06)',
  inputFocus: 'rgba(59, 130, 246, 0.15)',
};

export const glass: CSSProperties = {
  background: colors.card,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
};

export const glassHover: CSSProperties = {
  ...glass,
  transition: 'all 0.2s ease',
};

export const btn: CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none', color: '#fff',
  fontWeight: 600, fontSize: 15, cursor: 'pointer',
  background: `linear-gradient(135deg, ${colors.primary}, #2563eb)`,
  boxShadow: `0 4px 15px ${colors.primaryGlow}`,
};

export const btnSm: CSSProperties = {
  padding: '6px 12px', borderRadius: 6,
  border: `1px solid ${colors.border}`,
  background: colors.input,
  fontSize: 14, cursor: 'pointer', color: colors.dark,
  transition: 'all 0.15s ease',
};

export const input: CSSProperties = {
  padding: '12px 16px', borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: colors.input,
  fontSize: 16, outline: 'none', color: colors.dark,
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

export const select: CSSProperties = {
  ...input,
  cursor: 'pointer',
};

export const card: CSSProperties = {
  ...glass,
  padding: 28,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
};

export const globalStyle = `
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;

export const pageTitle: CSSProperties = {
  fontSize: 28, fontWeight: 700, color: colors.dark,
  letterSpacing: '-0.5px', marginBottom: 28,
};

export const sectionTitle: CSSProperties = {
  fontSize: 18, fontWeight: 600, marginBottom: 20, color: colors.dark,
  paddingBottom: 8, borderBottom: `1px solid ${colors.border}`,
  letterSpacing: '-0.3px',
};

export const tableHeader: CSSProperties = {
  padding: '14px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600,
  color: colors.slate, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
};

export const tableCell: CSSProperties = {
  padding: '14px 18px', fontSize: 16, color: colors.dark,
};

export const currencySymbols: Record<string, string> = { GHS: 'GHS', USD: '$', NGN: 'NGN', EUR: 'EUR', GBP: 'GBP' };

export function getCurrencySymbol(code?: string): string {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('displayCurrency') : null;
  const cur = code || saved || 'GHS';
  return currencySymbols[cur] || cur;
}

export const formatCurrency = (amount: number, currency?: string): string => {
  const sym = getCurrencySymbol(currency);
  return `${sym} ${amount.toFixed(2)}`;
};

export const statusBadge = (status: string): CSSProperties => {
  const map: Record<string, string> = {
    confirmed: '#3b82f6', checked_in: '#22c55e', checked_out: '#64748b',
    cancelled: '#ef4444', available: '#22c55e', reserved: '#a855f7',
    occupied: '#f59e0b', cleaning: '#06b6d4', maintenance: '#f97316',
    out_of_service: '#ef4444', pending: '#f59e0b', paid: '#22c55e',
    partial: '#f59e0b',
  };
  return {
    background: map[status] || '#475569',
    color: '#fff', padding: '4px 12px',
    borderRadius: 999, fontSize: 13, fontWeight: 600,
    textTransform: 'capitalize' as const,
    boxShadow: `0 0 12px ${map[status] || '#475569'}40`,
  };
};

export const scrollbarStyle = `
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
  select { background: rgba(255,255,255,0.06); color: #f1f5f9; border: 1px solid rgba(255,255,255,0.08); }
  select:focus { background: rgba(59,130,246,0.15); }
  option { background: #111125; color: #f1f5f9; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
`;
