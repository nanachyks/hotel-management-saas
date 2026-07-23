import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

const login = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null, token: null, login, logout: vi.fn(), loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe('Login', () => {
  beforeEach(() => {
    login.mockClear();
  });

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByTestId('brand-name')).toHaveTextContent('HotelEase');
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByText('Create one')).toBeInTheDocument();
  });

  it('calls login on form submission', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Enter your username'), 'admin');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(login).toHaveBeenCalledWith('admin', 'admin123');
  });

  it('shows error message when login fails', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Enter your username'), 'admin');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows busy state during login', async () => {
    let resolveLogin: (value: unknown) => void;
    login.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Enter your username'), 'admin');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Signing in...')).toBeInTheDocument();

    resolveLogin!(undefined);
  });
});
