import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyBookingsPage from '../../pages/MyBookingsPage';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { useReservations } from '../../hooks/useReservations';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: null,
}));

// Mock hooks
vi.mock('../../hooks/useReservations', () => ({
    useReservations: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
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
        window.history.pushState({}, '', '/my-bookings');
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
        vi.mocked(useAuth).mockReturnValue({
            role: 'user',
        });
        vi.mocked(useReservations).mockReturnValue({
            reservations: mockReservations,
            loading: false,
            reservationWindow: { label: 'last 30 days', cutoffDate: '2026-03-28' },
            cancelReservation: mockCancelReservation,
            updateReservation: vi.fn(),
            payReservation: vi.fn(),
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
            reservationWindow: { label: 'last 30 days', cutoffDate: '2026-03-28' },
            cancelReservation: vi.fn(),
            updateReservation: vi.fn(),
            payReservation: vi.fn(),
        });
        renderMyBookingsPage();
        expect(screen.getByText(/No upcoming bookings/i)).toBeInTheDocument();
    });

    it('opens detail sheet when clicking a booking', async () => {
        const user = userEvent.setup();
        renderMyBookingsPage();

        await user.click(screen.getByText('Upcoming Game'));
        expect(screen.getByText('Reservation Details')).toBeInTheDocument();
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

    it('shows rejected payment review instead of paid payment status', () => {
        vi.mocked(useReservations).mockReturnValue({
            reservations: [
                { ...mockReservations[0], payment_status: 'paid', payment_review_status: 'rejected' },
            ],
            loading: false,
            reservationWindow: { label: 'last 30 days', cutoffDate: '2026-03-28' },
            cancelReservation: mockCancelReservation,
            updateReservation: vi.fn(),
            payReservation: vi.fn(),
        });

        renderMyBookingsPage();

        expect(screen.getByText('Rejected')).toBeInTheDocument();
        expect(screen.queryByText('paid')).not.toBeInTheDocument();
    });

    it('applies admin payment review filter from the URL', () => {
        window.history.pushState({}, '', '/my-bookings?filter=payment_reviews');
        vi.mocked(useAuth).mockReturnValue({
            role: 'admin',
        });
        vi.mocked(useReservations).mockReturnValue({
            reservations: [
                { ...mockReservations[0], payment_review_status: 'pending' },
                { ...mockReservations[1], payment_review_status: 'approved' },
            ],
            loading: false,
            reservationWindow: { label: 'last 3 months', cutoffDate: '2026-01-28' },
            cancelReservation: mockCancelReservation,
            updateReservation: vi.fn(),
            payReservation: vi.fn(),
        });

        renderMyBookingsPage();
        expect(screen.getByText('Payment reviews')).toBeInTheDocument();
        expect(screen.getByText('Upcoming Game')).toBeInTheDocument();
        expect(screen.queryByText('Past Game')).not.toBeInTheDocument();
    });

    it('lets admins switch to needs admin action filter directly on the page', async () => {
        const user = userEvent.setup();
        vi.mocked(useAuth).mockReturnValue({
            role: 'admin',
        });
        vi.mocked(useReservations).mockReturnValue({
            reservations: [
                { ...mockReservations[0], status: 'pending_verification', payment_review_status: 'not_submitted' },
                { ...mockReservations[1], status: 'completed', payment_review_status: 'approved' },
            ],
            loading: false,
            reservationWindow: { label: 'last 3 months', cutoffDate: '2026-01-28' },
            cancelReservation: mockCancelReservation,
            updateReservation: vi.fn(),
            payReservation: vi.fn(),
        });

        renderMyBookingsPage();
        await user.click(screen.getByRole('button', { name: 'Needs admin action' }));

        expect(screen.getByText('Upcoming Game')).toBeInTheDocument();
        expect(screen.queryByText('Past Game')).not.toBeInTheDocument();
    });

    it('applies admin rejected bookings filter from the URL', () => {
        window.history.pushState({}, '', '/my-bookings?filter=rejected_bookings');
        vi.mocked(useAuth).mockReturnValue({
            role: 'admin',
        });
        vi.mocked(useReservations).mockReturnValue({
            reservations: [
                { ...mockReservations[0], payment_review_status: 'rejected' },
                { ...mockReservations[1], payment_review_status: 'approved' },
            ],
            loading: false,
            reservationWindow: { label: 'last 3 months', cutoffDate: '2026-01-28' },
            cancelReservation: mockCancelReservation,
            updateReservation: vi.fn(),
            payReservation: vi.fn(),
        });

        renderMyBookingsPage();
        expect(screen.getByText('Rejected bookings')).toBeInTheDocument();
        expect(screen.getByText('Upcoming Game')).toBeInTheDocument();
        expect(screen.queryByText('Past Game')).not.toBeInTheDocument();
    });
});
