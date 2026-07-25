import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Channels from '../pages/Channels';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1', role: 'admin' } }), AuthProvider: ({ children }: any) => children }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }), ToastProvider: ({ children }: any) => children }));

const mockChannels = [
  { id: '1', hotel_id: 'hotel-1', channel: 'Booking.com', name: 'Booking Channel', api_key: 'key1', endpoint_url: '', enabled: 1, last_sync_at: null, created_at: '2026-07-01T00:00:00Z' },
];

describe('Channels', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders channels after loading', async () => {
    api.get.mockResolvedValue(mockChannels);
    render(<Channels />);
    expect(await screen.findByText('Booking.com')).toBeInTheDocument();
    expect(screen.getByText('Booking Channel')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    api.get.mockResolvedValue([]);
    render(<Channels />);
    expect(await screen.findByText(/No channel connections yet/)).toBeInTheDocument();
  });
});
