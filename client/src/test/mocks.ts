import { vi } from 'vitest';

export function mockApi() {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  };
  vi.mock('../api/client', () => ({
    api: mock,
  }));
  return mock;
}

type AuthUser = { id: string; username: string; name: string; email: string; role: string; hotel_id: string } | null;

export function mockAuth(user: AuthUser = { id: '1', username: 'admin', name: 'Admin', email: 'admin@test.com', role: 'admin', hotel_id: 'hotel-1' }) {
  const auth = {
    user,
    token: user ? 'fake-token' : null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
  };
  vi.mock('../context/AuthContext', () => ({
    useAuth: () => auth,
    AuthProvider: ({ children }: any) => children,
  }));
  return auth;
}

export function mockToast() {
  const toast = vi.fn();
  vi.mock('../context/ToastContext', () => ({
    useToast: () => ({ toast }),
    ToastProvider: ({ children }: any) => children,
  }));
  return toast;
}

export function mockNotifications(unread = 0) {
  const notif = {
    notifications: [],
    unread,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    refresh: vi.fn(),
  };
  vi.mock('../context/NotificationContext', () => ({
    useNotifications: () => notif,
    NotificationProvider: ({ children }: any) => children,
  }));
  return notif;
}

export function mockNavigate() {
  const navigate = vi.fn();
  const mockModule = { useNavigate: () => navigate };
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => navigate };
  });
  return navigate;
}
