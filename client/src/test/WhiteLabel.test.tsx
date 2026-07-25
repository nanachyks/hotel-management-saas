import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhiteLabel from '../pages/WhiteLabel';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));
vi.mock('../context/BrandContext', () => ({ useBrand: () => ({ primaryColor: '#3b82f6', setPrimaryColor: vi.fn() }), BrandProvider: ({ children }: any) => children }));

const mockSettings = {
  custom_domain: 'app.mybrand.com', logo_url: '/logo.png', favicon_url: '/favicon.ico',
  primary_color: '#3b82f6', email_from_name: 'My Brand', email_logo_url: '/email-logo.png',
  custom_css: '', footer_text: 'c 2024 My Brand',
};

describe('WhiteLabel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders white-label settings after loading', async () => {
    api.get.mockResolvedValue(mockSettings);
    render(<WhiteLabel />);
    expect(await screen.findByDisplayValue('app.mybrand.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/logo.png')).toBeInTheDocument();
  });
});
