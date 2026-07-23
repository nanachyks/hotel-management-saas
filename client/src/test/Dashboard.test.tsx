import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));

vi.mock('../api/client', () => ({ api }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', username: 'admin', name: 'Admin', email: 'admin@test.com', role: 'admin', hotel_id: 'hotel-1' }, token: 't', loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

const mockData = {
  totalRooms: 10, availableRooms: 5, occupiedRooms: 3, maintenanceRooms: 2,
  occupancyRate: 30, checkInsToday: 2, checkOutsToday: 1, activeBookings: 4,
  totalRevenue: 15000, totalExpenses: 3000, taxCollected: 1500, pendingPayments: 3000,
  recentBookings: [
    { id: '1', guest_name: 'John Doe', room_number: '101', check_in_date: '2026-07-01', check_out_date: '2026-07-03', status: 'checked_in', total_amount: 900 },
  ],
  charts: {
    revenueTrend: [],
    bookingTrend: [],
    roomStatus: [],
    monthlyOccupancy: [],
  },
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Dashboard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders dashboard stats after loading', async () => {
    api.get.mockResolvedValue(mockData);
    render(<Dashboard />);

    expect(await screen.findByText('Total Rooms')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders recent bookings table', async () => {
    api.get.mockResolvedValue(mockData);
    render(<Dashboard />);

    expect(await screen.findByText('Recent Bookings')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('GHS 900.00')).toBeInTheDocument();
  });

  it('hides recent bookings section when empty', async () => {
    api.get.mockResolvedValue({ ...mockData, recentBookings: [] });
    render(<Dashboard />);

    expect(await screen.findByText('Total Rooms')).toBeInTheDocument();
    expect(screen.queryByText('Recent Bookings')).not.toBeInTheDocument();
  });
});
