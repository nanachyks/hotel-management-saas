import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Rooms from '../pages/Rooms';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}));

vi.mock('../api/client', () => ({ api }));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', username: 'admin', name: 'Admin', email: 'admin@test.com', role: 'admin', hotel_id: 'hotel-1' }, token: 't', loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

const mockRooms = [
  { id: 'r1', room_number: '101', room_type_id: 'rt1', floor: 1, status: 'available', room_type_name: 'Standard Single', base_price: 300 },
  { id: 'r2', room_number: '102', room_type_id: 'rt2', floor: 1, status: 'maintenance', room_type_name: 'Deluxe', base_price: 650 },
];

describe('Rooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(mockRooms);
  });

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<Rooms />);
    expect(screen.getByText('Rooms')).toBeInTheDocument();
  });

  it('renders rooms list after loading', async () => {
    render(<Rooms />);

    expect(await screen.findByText('101')).toBeInTheDocument();
    expect(screen.getByText('102')).toBeInTheDocument();
    expect(screen.getByText('Standard Single')).toBeInTheDocument();
    expect(screen.getByText('Deluxe')).toBeInTheDocument();
  });

  it('renders empty state when no rooms', async () => {
    api.get.mockResolvedValue([]);
    render(<Rooms />);

    expect(await screen.findByText('No rooms match your filters. Click "+ New Room" to add one.')).toBeInTheDocument();
  });

  it('opens create form when clicking + New Room', async () => {
    render(<Rooms />);

    await userEvent.click(await screen.findByText('+ New Room'));
    expect(screen.getByText('New Room')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Room Number')).toBeInTheDocument();
  });

  it('creates a new room via form', async () => {
    api.post.mockResolvedValue({});
    render(<Rooms />);

    await userEvent.click(await screen.findByText('+ New Room'));
    await userEvent.type(screen.getByPlaceholderText('Room Number'), '201');
    await userEvent.click(screen.getByText('Save'));

    expect(api.post).toHaveBeenCalledWith('/rooms', expect.objectContaining({ room_number: '201' }));
  });

  it('opens edit form when clicking Edit', async () => {
    render(<Rooms />);

    const editButtons = await screen.findAllByText('Edit');
    await userEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Room')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Room Number')).toHaveValue('101');
  });

  it('has status dropdown for changing room status', async () => {
    render(<Rooms />);

    const statusSelects = await screen.findAllByRole('combobox');
    expect(statusSelects.length).toBeGreaterThan(0);
  });

  it('renders room status badges', async () => {
    render(<Rooms />);

    expect(await screen.findByText('available')).toBeInTheDocument();
    const maintenanceBadges = screen.getAllByText('maintenance');
    expect(maintenanceBadges.length).toBeGreaterThanOrEqual(1);
  });
});
