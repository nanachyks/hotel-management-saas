import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface Notification {
  id: string; type: string; title: string; message: string; link: string;
  read: number; created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unread: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const POLL_INTERVAL = 15000;

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* audio not available */ }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const prevUnreadRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const refresh = useCallback(() => {
    if (!user) { setNotifications([]); setUnread(0); return; }
    api.get<{ data: Notification[]; unread: number }>('/notifications')
      .then(r => {
        setNotifications(r.data);
        setUnread(prev => {
          if (r.unread > prev && prev > 0) playNotificationSound();
          return r.unread;
        });
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh]);

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`, {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all', {});
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setUnread(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
