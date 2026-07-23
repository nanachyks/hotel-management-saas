import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string; username: string; name: string; email: string; role: string; hotel_id: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = async (tok: string): Promise<User> => {
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${tok}` } });
    if (!res.ok) throw new Error('Invalid token');
    const data = await res.json().catch(() => { throw new Error('Failed to connect to server'); });
    return data.user;
  };

  const tryRefresh = async () => {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) { setLoading(false); return; }
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setToken(data.token);
      const u = await fetchUser(data.token);
      setUser(u);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser(token).then(u => { setUser(u); setLoading(false); }).catch(() => { tryRefresh(); });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText || 'Login failed' }));
        const error: any = new Error(err.error || 'Login failed');
        if (err.needsVerification) {
          error.needsVerification = true;
          error.email = err.email;
        }
        throw error;
      }
      const data = await res.json().catch(() => { throw new Error('Failed to connect to server'); });
      localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      setToken(data.token);
      setUser(data.user);
    } finally {
      clearTimeout(timeout);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
