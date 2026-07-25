import { useBrand } from '../context/BrandContext';
import { btnSm, input, colors as c } from '../styles';

const presetColors = [
  '#3b82f6', '#2563eb', '#7c3aed', '#8b5cf6', '#a855f7',
  '#ec4899', '#db2777', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#22c55e', '#10b981', '#06b6d4', '#14b8a6',
  '#6366f1', '#64748b', '#475569', '#0ea5e9', '#0284c7',
];

export default function ColorPicker() {
  const { primaryColor, setPrimaryColor, saving } = useBrand();

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8, marginBottom: 12 }}>
        {presetColors.map(color => (
          <button
            key={color}
            title={color}
            onClick={() => setPrimaryColor(color)}
            style={{
              width: '100%', aspectRatio: '1', borderRadius: 8, border: primaryColor === color ? '2px solid #fff' : `2px solid ${c.border}`,
              background: color, cursor: 'pointer', transition: 'all 0.15s ease',
              boxShadow: primaryColor === color ? `0 0 12px ${color}60` : 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.zIndex = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '0'; }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="color"
            value={primaryColor}
            onChange={e => setPrimaryColor(e.target.value)}
            style={{ width: 48, height: 40, padding: 2, background: c.input, border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer' }}
          />
        </div>
        <input
          value={primaryColor}
          onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setPrimaryColor(e.target.value); }}
          style={{ ...input, width: 140, fontFamily: 'monospace', fontSize: 14 }}
          placeholder="#3b82f6"
        />
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: primaryColor,
          border: `1px solid ${c.border}`, flexShrink: 0,
        }} />
        {saving && <span style={{ fontSize: 13, color: c.slate }}>Saving...</span>}
      </div>
    </div>
  );
}
