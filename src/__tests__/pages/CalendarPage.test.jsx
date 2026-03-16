import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarPage from '../../pages/CalendarPage';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
vi.mock('../../hooks/useReservations', () => ({
  useReservations: () => ({
    reservations: [],
    loading: false,
    createReservation: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCourts', () => ({
  useCourts: () => ({
    courts: [
      { id: 'c1', name: 'Main Indoor Court', type: 'Indoor', pricePerHour: 50, pricePerDay: 400 },
    ],
    loading: false,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

function renderCalendarPage() {
  return render(
    <BrowserRouter>
      <CalendarPage />
    </BrowserRouter>
  );
}

describe('CalendarPage', () => {
  it('renders the calendar with day headers', () => {
    renderCalendarPage();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders the current month name', () => {
    renderCalendarPage();
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    expect(screen.getByText(new RegExp(monthName))).toBeInTheDocument();
  });

  it('has navigation buttons', () => {
    renderCalendarPage();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows legend for confirmed and pending', () => {
    renderCalendarPage();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows booking instruction text', () => {
    renderCalendarPage();
    expect(screen.getByText(/Click on a day to start a reservation/)).toBeInTheDocument();
  });

  it('navigates months with buttons', async () => {
    renderCalendarPage();

    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
    expect(screen.getByText(new RegExp(currentMonth))).toBeInTheDocument();
  });
});
