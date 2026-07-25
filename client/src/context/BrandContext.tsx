import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface BrandSettings {
  primary_color: string;
}

interface BrandContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  saving: boolean;
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

const BrandContext = createContext<BrandContextType>({
  primaryColor: '#3b82f6',
  setPrimaryColor: () => {},
  saving: false,
});

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [primaryColor, setPrimaryColorState] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !getToken()) return;
    api.get<{ primary_color?: string }>('/white-label')
      .then(data => {
        if (data?.primary_color) {
          setPrimaryColorState(data.primary_color);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const rgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-glow', rgba(primaryColor, 0.3));
    document.documentElement.style.setProperty('--color-input-focus', rgba(primaryColor, 0.15));
    document.documentElement.style.setProperty('--color-primary-012', rgba(primaryColor, 0.12));
    document.documentElement.style.setProperty('--color-primary-02', rgba(primaryColor, 0.2));
    document.documentElement.style.setProperty('--color-primary-006', rgba(primaryColor, 0.06));
    document.documentElement.style.setProperty('--color-primary-015', rgba(primaryColor, 0.15));
    document.documentElement.style.setProperty('--color-primary-01', rgba(primaryColor, 0.1));
  }, [primaryColor]);

  const setPrimaryColor = useCallback(async (color: string) => {
    setPrimaryColorState(color);
    setSaving(true);
    try {
      await api.put('/white-label', { primary_color: color });
    } catch {}
    setSaving(false);
  }, []);

  return (
    <BrandContext.Provider value={{ primaryColor, setPrimaryColor, saving }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
