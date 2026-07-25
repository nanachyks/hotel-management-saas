import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { colors } from '../styles';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number; message: string; type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '14px 24px', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 280, maxWidth: 420,
            animation: 'slideIn 0.25s ease-out',
            background: t.type === 'success' ? '#22c55e' : t.type === 'error' ? '#ef4444' : colors.primary,
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
