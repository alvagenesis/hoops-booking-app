import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BookingPage from '../../pages/BookingPage';
import { BrowserRouter } from 'react-router-dom';

const mockCreateReservation = vi.fn(() => Promise.resolve());
const mockGetSlotsForDay = vi.fn(() => [
    { start: '09:00', end: '10:00', label: '9 AM - 10 AM' }
]);
const mockGetBookedSlotsForDay = vi.fn(() => Promise.resolve([]));

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

vi.mock('../../hooks/useCourts', () => ({
    useCourts: () => ({
        courts: [
            { id: 'c1', name: 'Main Indoor Court', description: 'Hardwood', color: '#8B5CF6', hourly_rate: 500 },
        ],
        loading: false,
    }),
}));

vi.mock('../../hooks/useTimeSlots', () => ({
    useTimeSlots: () => ({
        getSlotsForDay: mockGetSlotsForDay,
        getBookedSlotsForDay: mockGetBookedSlotsForDay,
    }),
}));

vi.mock('../../hooks/useReservations', () => ({
    useReservations: () => ({
        createReservation: mockCreateReservation,
    }),
}));

vi.mock('../../components/booking/CourtSelection', () => ({
    default: ({ onSelect }) => (
        <button onClick={() => onSelect({ id: 'c1', name: 'Main Indoor Court', hourly_rate: 500 })}>
            Select Court
        </button>
    )
}));

vi.mock('../../components/booking/DateSelection', () => ({
    default: ({ onSelect }) => (
        <button onClick={() => onSelect({ from: new Date(2026, 1, 26) })}>
            Select Date
        </button>
    )
}));

vi.mock('../../components/booking/TimeSlotSelection', () => ({
    default: ({ onSelect, slots, selectedSlots }) => (
        <div>
            <div>Selected count: {selectedSlots.length}</div>
            <button onClick={() => onSelect([slots[0]])}>
                Select Time
            </button>
        </div>
    )
}));

vi.mock('../../components/booking/BookingReview', () => ({
    default: ({ onConfirm }) => (
        <button onClick={() => onConfirm({ title: 'Test Booking', notes: '', totalAmount: 500, dates: [new Date(2026, 1, 26)] })}>
            Confirm Booking
        </button>
    )
}));

const renderBookingPage = () => render(
    <BrowserRouter>
        <BookingPage />
    </BrowserRouter>
);

describe('BookingPage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 1, 26, 8, 0));
        mockCreateReservation.mockClear();
        mockGetSlotsForDay.mockClear();
        mockGetBookedSlotsForDay.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts at step 0 (Court Selection)', () => {
        renderBookingPage();
        expect(screen.getByText('Court')).toHaveClass('text-gray-200');
        expect(screen.getByText('Select Court')).toBeInTheDocument();
    });

    it('disables "Next" until a court is selected', () => {
        renderBookingPage();
        const nextButton = screen.getByText('Next');
        expect(nextButton).toBeDisabled();

        fireEvent.click(screen.getByText('Select Court'));
        expect(nextButton).not.toBeDisabled();
    });

    it('advances through steps correctly', async () => {
        renderBookingPage();

        fireEvent.click(screen.getByText('Select Court'));
        fireEvent.click(screen.getByText('Next'));

        expect(screen.getByText('Date')).toHaveClass('text-gray-200');
        fireEvent.click(screen.getByText('Select Date'));
        fireEvent.click(screen.getByText('Next'));

        expect(screen.getByText('Time')).toHaveClass('text-gray-200');
        fireEvent.click(screen.getByText('Select Time'));
        fireEvent.click(screen.getByText('Next'));
        await act(async () => {});

        expect(screen.getByText('Review')).toHaveClass('text-gray-200');
        expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });

    it('allows navigating back', () => {
        renderBookingPage();

        fireEvent.click(screen.getByText('Select Court'));
        fireEvent.click(screen.getByText('Next'));

        expect(screen.getByText('Date')).toHaveClass('text-gray-200');

        fireEvent.click(screen.getByText('Back'));
        expect(screen.getByText('Court')).toHaveClass('text-gray-200');
    });

    it('blocks advancing when a previously selected slot becomes too soon before clicking next', async () => {
        renderBookingPage();

        fireEvent.click(screen.getByText('Select Court'));
        fireEvent.click(screen.getByText('Next'));
        fireEvent.click(screen.getByText('Select Date'));
        fireEvent.click(screen.getByText('Next'));

        fireEvent.click(screen.getByText('Select Time'));
        expect(screen.getByText('Selected count: 1')).toBeInTheDocument();

        await act(async () => {
            vi.setSystemTime(new Date(2026, 1, 26, 8, 31));
        });
        fireEvent.click(screen.getByText('Next'));
        await act(async () => {});

        expect(screen.getByText('Time')).toHaveClass('text-gray-200');
        expect(screen.getByText('Selected count: 0')).toBeInTheDocument();
        expect(screen.getByText('Selected time slot is no longer valid. Please choose a new slot.')).toBeInTheDocument();
        expect(screen.queryByText('Confirm Booking')).not.toBeInTheDocument();
    });
});
