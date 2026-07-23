import { btn, btnSm, card, colors } from '../styles';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ ...card, padding: 28, width: 400, maxWidth: '90vw' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.dark, marginBottom: 12 }}>{title}</h3>
        <p style={{ color: colors.slate, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnSm}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            ...btn, background: danger ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
            boxShadow: danger ? '0 4px 15px rgba(239,68,68,0.3)' : undefined,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
