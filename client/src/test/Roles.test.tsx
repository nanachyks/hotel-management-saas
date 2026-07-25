import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Roles from '../pages/Roles';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));

const mockRoles = [
  { id: '1', hotel_id: 'hotel-1', name: 'Manager', permissions: '["rooms:read","rooms:write"]', created_at: '2026-07-01T00:00:00Z' },
];

describe('Roles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders roles after loading', async () => {
    api.get.mockResolvedValue(mockRoles);
    render(<Roles />);
    expect(await screen.findByText(/Assign Role/)).toBeInTheDocument();
    expect((await screen.findAllByText('Manager')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/rooms:read/)).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    api.get.mockResolvedValue([]);
    render(<Roles />);
    expect(await screen.findByText(/No custom roles yet/)).toBeInTheDocument();
  });
});
