import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';

let mockRole = 'admin';
let mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', name: 'Admin User', email: 'admin@test.com', role: mockRole, hotel_id: 'hotel-1' },
    token: 't', loading: false, login: vi.fn(), logout: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({ notifications: [], unread: 0, markRead: vi.fn(), markAllRead: vi.fn(), refresh: vi.fn() }),
  NotificationProvider: ({ children }: any) => children,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLayout() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  it('renders sidebar with brand name', () => {
    renderLayout();
    expect(screen.getByTestId('brand-name')).toHaveTextContent('HotelEase');
  });

  it('renders all navigation items for admin', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('Guests')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows Users nav item only for admin role', () => {
    mockRole = 'admin';
    renderLayout();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows Users nav item for owner role', () => {
    mockRole = 'owner';
    renderLayout();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('hides Users nav item for receptionist role', () => {
    mockRole = 'receptionist';
    renderLayout();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('hides Invoices and Services for receptionist role', () => {
    mockRole = 'receptionist';
    renderLayout();
    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });

  it('shows Invoices for accountant role', () => {
    mockRole = 'accountant';
    renderLayout();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.queryByText('Guests')).not.toBeInTheDocument();
  });

  it('shows only Rooms and Calendar for housekeeping role', () => {
    mockRole = 'housekeeping';
    renderLayout();
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.queryByText('Guests')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('displays user name and role', () => {
    mockRole = 'admin';
    renderLayout();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders Sign Out button', () => {
    renderLayout();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('renders child route content', () => {
    renderLayout();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
