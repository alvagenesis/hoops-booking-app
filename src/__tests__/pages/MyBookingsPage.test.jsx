import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyBookingsPage from '../../pages/MyBookingsPage';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { useReservations } from '../../hooks/useReservations';
import { useNavigate } from 'react-router-dom';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: null,
}));

// Mock hooks
vi.mock('../../hooks/useReservations', () => ({
    useReservations: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

const mockReservations = [
    {
        id: 'r1',
        title: 'Upcoming Game',
        status: 'confirmed',
        start_time: '09:00',
        end_time: '11:00',
        total_amount: 1000,
        courts: { name: 'Main Court', color: '#8B5CF6' },
        reservation_days: [{ id: 'rd1', date: '2026-12-01' }],
    },
    {
        id: 'r2',
        title: 'Past Game',
        status: 'completed',
        start_time: '14:00',
        end_time: '16:00',
        total_amount: 500,
        courts: { name: 'Street Court', color: '#F97316' },
        reservation_days: [{ id: 'rd2', date: '2026-01-01' }],
    },
    {
        id: 'r3',
        title: 'Cancelled Game',
        status: 'cancelled',
        start_time: '10:00',
        end_time: '12:00',
        total_amount: 300,
        courts: { name: 'Main Court', color: '#8B5CF6' },
        reservation_days: [{ id: 'rd3', date: '2026-12-05' }],
    },
];

const renderMyBookingsPage = () => {
    return render(
        <BrowserRouter>
            <MyBookingsPage />
        </BrowserRouter>
    );
};

describe('MyBookingsPage', () => {
    const mockNavigate = vi.fn();
    const mockCancelReservation = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
        vi.mocked(useReservations).mockReturnValue({
            reservations: mockReservations,
            loading: false,
            cancelReservation: mockCancelReservation,
        });
    });

    it('renders with bookings and shows upcoming tab by default', () => {
        renderMyBookingsPage();
        expect(screen.getByText('Upcoming Game')).toBeInTheDocument();
        expect(screen.queryByText('Past Game')).not.toBeInTheDocument();
        expect(screen.queryByText('Cancelled Game')).not.toBeInTheDocument();
    });

    it('switches tabs correctly', async () => {
        const user = userEvent.setup();
        renderMyBookingsPage();

        // Switch to Past
        await user.click(screen.getByText(/past/i));
        expect(screen.getByText('Past Game')).toBeInTheDocument();
        expect(screen.queryByText('Upcoming Game')).not.toBeInTheDocument();

        // Switch to Cancelled
        await user.click(screen.getByText(/cancelled/i));
        expect(screen.getByText('Cancelled Game')).toBeInTheDocument();
        expect(screen.queryByText('Past Game')).not.toBeInTheDocument();
    });

    it('shows empty state when no bookings for the tab', () => {
        vi.mocked(useReservations).mockReturnValue({
            reservations: [],
            loading: false,
            cancelReservation: vi.fn(),
        });
        renderMyBookingsPage();
        expect(screen.getByText(/No upcoming bookings/i)).toBeInTheDocument();
    });

    it('opens detail sheet when clicking a booking', async () => {
        const user = userEvent.setup();
        renderMyBookingsPage();

        await user.click(screen.getByText('Upcoming Game'));
        expect(screen.getByText('Booking Details')).toBeInTheDocument();
        expect(screen.getAllByText('Main Court').length).toBeGreaterThanOrEqual(1);
    });

    it('starts cancellation from the list', async () => {
        const user = userEvent.setup();
        renderMyBookingsPage();

        await user.click(screen.getByText('Cancel Booking'));
        expect(mockCancelReservation).toHaveBeenCalledWith('r1');
    });

    it('navigates to booking page when clicking New Booking', async () => {
        const user = userEvent.setup();
        renderMyBookingsPage();

        await user.click(screen.getByText(/New Booking/i));
        expect(mockNavigate).toHaveBeenCalledWith('/book');
    });
});
