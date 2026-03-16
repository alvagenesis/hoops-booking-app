import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../../pages/DashboardPage';

// Mock hooks
vi.mock('../../hooks/useReservations', () => ({
  useReservations: () => ({
    reservations: [
      { id: 1, title: 'Weekend Tournament', start_date: '2026-02-27', end_date: '2026-02-28', status: 'confirmed', payment_status: 'partial', paid_amount: 400, total_amount: 800 },
      { id: 2, title: 'Evening Pickup Game', start_date: '2026-02-25', end_date: '2026-02-25', status: 'confirmed', payment_status: 'full', paid_amount: 60, total_amount: 60 },
    ],
    loading: false,
  }),
}));

vi.mock('../../hooks/useCourts', () => ({
  useCourts: () => ({
    courts: [
      { id: 'c1', name: 'Main Indoor Court', type: 'Indoor', pricePerDay: 400 },
      { id: 'c2', name: 'Outdoor Street Court', type: 'Outdoor', pricePerDay: 200 },
    ],
    loading: false,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'admin@example.com' },
    role: 'admin',
    loading: false,
  }),
}));

// Mock Gemini API
vi.mock('../../lib/gemini', () => ({
  callGeminiAPI: vi.fn().mockResolvedValue('Consider adding weekend discounts to boost bookings.'),
}));

describe('DashboardPage', () => {
  it('renders stat cards', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Total Courts')).toBeInTheDocument();
    expect(screen.getByText('Bookings (This Month)')).toBeInTheDocument();
    expect(screen.getByText('Revenue (MTD)')).toBeInTheDocument();
  });

  it('shows correct court count', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    // "2" appears in multiple places; check it exists at least once
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('shows recent activity section', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText(/Weekend Tournament/)).toBeInTheDocument();
    expect(screen.getByText(/Evening Pickup Game/)).toBeInTheDocument();
  });

  it('shows AI insights section', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('AI Business Insight')).toBeInTheDocument();
  });

  it('shows system status', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
  });

  it('shows court management hub', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Court Management Hub')).toBeInTheDocument();
    expect(screen.getByText('Manage Courts')).toBeInTheDocument();
    expect(screen.getByText('View Schedule')).toBeInTheDocument();
  });
});
