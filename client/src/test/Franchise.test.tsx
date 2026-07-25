import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Franchise from '../pages/Franchise';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));

const mockFranchises = [
  { id: '1', name: 'Hotel Alpha', parent_hotel_id: 'hotel-1', settings: '{}', member_count: 3 },
];

describe('Franchise', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders franchises after loading', async () => {
    api.get.mockResolvedValue(mockFranchises);
    render(<Franchise />);
    expect(await screen.findByText('Hotel Alpha')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    api.get.mockResolvedValue([]);
    render(<Franchise />);
    expect(await screen.findByText(/No franchise groups yet/)).toBeInTheDocument();
  });
});
