import { colors, btnSm, input } from '../styles';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function Pagination({ page, limit, total, onPageChange, onLimitChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages: number[] = [];
  for (let i = start; i < start + 5 && i <= totalPages; i++) pages.push(i);

  if (totalPages <= 1) return null;

  const pageBtn = (p: number, label?: string) => (
    <button
      key={label || p}
      onClick={() => onPageChange(p)}
      disabled={p === page}
      style={{
        ...btnSm, minWidth: 36, textAlign: 'center',
        background: p === page ? colors.primary : colors.input,
        color: p === page ? '#fff' : colors.dark,
        border: p === page ? 'none' : undefined,
        opacity: p === page ? 1 : 0.7,
      }}
    >
      {label || p}
    </button>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: colors.slate }}>Rows:</span>
        <select value={limit} onChange={e => onLimitChange(Number(e.target.value))} style={{ ...btnSm, cursor: 'pointer' }}>
          {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span style={{ fontSize: 13, color: colors.slate }}>{Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} of {total}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {page > 1 && pageBtn(1, 'First')}
        {page > 1 && pageBtn(page - 1, 'Prev')}
        {pages.map(p => pageBtn(p))}
        {page < totalPages && pageBtn(page + 1, 'Next')}
        {page < totalPages && pageBtn(totalPages, 'Last')}
      </div>
    </div>
  );
}
