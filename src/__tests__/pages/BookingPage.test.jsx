import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingPage from '../../pages/BookingPage';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: 'u1' } }),
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
        getSlotsForDay: vi.fn(() => [
            { start: '09:00', end: '10:00', label: '9 AM – 10 AM' }
        ]),
        getBookedSlotsForDay: vi.fn(() => Promise.resolve([])),
    }),
}));

vi.mock('../../hooks/useReservations', () => ({
    useReservations: () => ({
        createReservation: vi.fn(() => Promise.resolve()),
    }),
}));

// Mock sub-components to focus on BookingPage state logic
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
    default: ({ onSelect, slots }) => (
        <button onClick={() => onSelect(slots[0])}>
            Select Time
        </button>
    )
}));

vi.mock('../../components/booking/BookingReview', () => ({
    default: ({ onConfirm }) => (
        <button onClick={() => onConfirm({ title: 'Test Booking', notes: '', totalAmount: 500, dates: [new Date(2026, 1, 26)] })}>
            Confirm Booking
        </button>
    )
}));

const renderBookingPage = () => {
    return render(
        <BrowserRouter>
            <BookingPage />
        </BrowserRouter>
    );
};

describe('BookingPage', () => {
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

        // Step 0: Court
        fireEvent.click(screen.getByText('Select Court'));
        fireEvent.click(screen.getByText('Next'));

        // Step 1: Date
        expect(screen.getByText('Date')).toHaveClass('text-gray-200');
        fireEvent.click(screen.getByText('Select Date'));
        fireEvent.click(screen.getByText('Next'));

        // Step 2: Time
        expect(screen.getByText('Time')).toHaveClass('text-gray-200');
        fireEvent.click(screen.getByText('Select Time'));
        fireEvent.click(screen.getByText('Next'));

        // Step 3: Review
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
});
