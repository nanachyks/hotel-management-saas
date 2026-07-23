import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

let mockUser: any = { id: '1', username: 'test', name: 'Test', email: 'test@test.com', role: 'staff', hotel_id: 'hotel-1' };
let mockLoading = false;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, token: mockUser ? 't' : null, loading: mockLoading, login: vi.fn(), logout: vi.fn() }),
  AuthProvider: ({ children }: any) => children,
}));

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    mockUser = { id: '1', username: 'test', name: 'Test', email: 'test@test.com', role: 'staff', hotel_id: 'hotel-1' };
    mockLoading = false;
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockUser = null;
    mockLoading = false;
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading state when auth is loading', () => {
    mockUser = null;
    mockLoading = true;
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
