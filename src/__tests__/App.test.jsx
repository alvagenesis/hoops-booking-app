import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock auth context
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock page components
vi.mock('../pages/AuthPage', () => ({
  default: () => <div data-testid="auth-page">Auth Page</div>,
}));
vi.mock('../pages/DashboardPage', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));
vi.mock('../pages/CalendarPage', () => ({
  default: () => <div data-testid="calendar-page">Calendar Page</div>,
}));
vi.mock('../pages/MembersPage', () => ({
  default: () => <div data-testid="members-page">Members Page</div>,
}));

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderApp();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderApp('/dashboard');
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('shows login page at /login', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderApp('/login');
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('redirects from /login to dashboard when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      displayName: 'John Doe',
      role: 'admin',
      signOut: vi.fn(),
    });
    renderApp('/login');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('shows dashboard when authenticated and on /dashboard', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      displayName: 'John Doe',
      role: 'admin',
      signOut: vi.fn(),
    });
    renderApp('/dashboard');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('shows calendar when authenticated and on /calendar', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      displayName: 'John Doe',
      role: 'admin',
      signOut: vi.fn(),
    });
    renderApp('/calendar');
    expect(screen.getByTestId('calendar-page')).toBeInTheDocument();
  });

  it('shows sidebar with navigation when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      displayName: 'John Doe',
      role: 'admin',
      signOut: vi.fn(),
    });
    renderApp('/dashboard');
    expect(screen.getByAltText('YMCA Logo')).toBeInTheDocument();
    // Use getAllByText since "Dashboard" appears in both nav and page title
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('displays user info in sidebar', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      displayName: 'John Doe',
      role: 'admin',
      signOut: vi.fn(),
    });
    renderApp('/dashboard');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
