import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApiKeys from '../pages/ApiKeys';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));

const mockKeys = [
  { id: '1', name: 'Stripe API', key: 'sk_live_abc123', permissions: '["read"]', ip_whitelist: '[]', rate_limit: 100, last_used_at: '2026-07-20T00:00:00Z', created_at: '2026-06-01T00:00:00Z', status: 'active' },
];

describe('ApiKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders API keys after loading', async () => {
    api.get.mockResolvedValue(mockKeys);
    render(<ApiKeys />);
    expect(await screen.findByText('Stripe API')).toBeInTheDocument();
    expect(screen.getByText(/sk_live/)).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    api.get.mockResolvedValue([]);
    render(<ApiKeys />);
    expect(await screen.findByText(/No API keys yet/)).toBeInTheDocument();
  });
});
