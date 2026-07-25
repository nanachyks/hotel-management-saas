import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Enterprise from '../pages/Enterprise';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));

const mockClients = [
  { id: '1', name: 'Mega Corp', slug: 'mega', address: '123 Main', phone: '555-0100', email: 'admin@megacorp.com', currency: 'GHS', timezone: 'Africa/Accra', logo_url: '', status: 'active', membership_role: 'owner' },
];

describe('Enterprise', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders enterprise hotels after loading', async () => {
    api.get.mockResolvedValue(mockClients);
    render(<Enterprise />);
    expect(await screen.findByText('Mega Corp')).toBeInTheDocument();
    expect(screen.getByText('GHS')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    api.get.mockResolvedValue([]);
    render(<Enterprise />);
    expect(await screen.findByText(/No properties yet/)).toBeInTheDocument();
  });
});
