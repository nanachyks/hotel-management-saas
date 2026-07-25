import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Corporate from '../pages/Corporate';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));
vi.mock('../context/BrandContext', () => ({ useBrand: () => ({ primaryColor: '#3b82f6', setPrimaryColor: vi.fn() }), BrandProvider: ({ children }: any) => children }));

const mockAccounts = [
  { id: '1', company_name: 'Acme Corp', contact_name: 'John', contact_email: 'john@acme.com', contact_phone: '123', credit_limit: 5000, payment_terms: 'net30', discount_rate: 5, notes: '', status: 'active' },
];

describe('Corporate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading then renders accounts', async () => {
    api.get.mockResolvedValue(mockAccounts);
    render(<Corporate />);
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('net30')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    api.get.mockResolvedValue([]);
    render(<Corporate />);
    expect(await screen.findByText(/No corporate accounts yet/)).toBeInTheDocument();
  });
});
