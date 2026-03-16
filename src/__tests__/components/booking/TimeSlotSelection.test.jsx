import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeSlotSelection from '../../../components/booking/TimeSlotSelection';

const mockSlots = [
    { start: '08:00', end: '09:00', label: '8 AM – 9 AM' },
    { start: '09:00', end: '10:00', label: '9 AM – 10 AM' },
    { start: '10:00', end: '11:00', label: '10 AM – 11 AM' },
];

describe('TimeSlotSelection', () => {
    it('renders the title and slots', () => {
        render(<TimeSlotSelection slots={mockSlots} selectedSlot={null} onSelect={vi.fn()} />);
        expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
        expect(screen.getByText('8 AM – 9 AM')).toBeInTheDocument();
        expect(screen.getByText('9 AM – 10 AM')).toBeInTheDocument();
        expect(screen.getByText('10 AM – 11 AM')).toBeInTheDocument();
    });

    it('shows empty state when no slots provided', () => {
        render(<TimeSlotSelection slots={[]} selectedSlot={null} onSelect={vi.fn()} />);
        expect(screen.getByText(/No time slots available/)).toBeInTheDocument();
    });

    it('calls onSelect when a slot is clicked', async () => {
        // Mock system time to be before the slots on the same day
        vi.setSystemTime(new Date(2026, 1, 26, 0, 0));
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<TimeSlotSelection slots={mockSlots} selectedSlot={null} onSelect={onSelect} />);

        await user.click(screen.getByTestId('slot-09:00'));
        expect(onSelect).toHaveBeenCalledWith(mockSlots[1]);
        vi.useRealTimers();
    });

    it('highlights the selected slot', () => {
        render(<TimeSlotSelection slots={mockSlots} selectedSlot={mockSlots[1]} onSelect={vi.fn()} />);
        const selectedButton = screen.getByText('9 AM – 10 AM').closest('button');
        expect(selectedButton).toHaveClass('border-purple-500');
    });

    it('disables and marks booked slots', () => {
        const bookedSlots = [{ start_time: '09:00', end_time: '10:00' }];
        render(<TimeSlotSelection slots={mockSlots} selectedSlot={null} onSelect={vi.fn()} bookedSlots={bookedSlots} />);

        const bookedButton = screen.getByText('9 AM – 10 AM').closest('button');
        expect(bookedButton).toBeDisabled();
        expect(screen.getByText('Booked')).toBeInTheDocument();
    });

    it('marks slots as "Too soon" if they are within 1 hour', () => {
        // Mock current time to be 8:30 AM
        vi.setSystemTime(new Date(2026, 1, 26, 8, 30));

        const slots = [
            { start: '09:00', end: '10:00', label: '9 AM – 10 AM' }, // Within 1 hour
            { start: '10:30', end: '11:30', label: '10:30 AM – 11:30 AM' } // More than 1 hour away
        ];

        render(<TimeSlotSelection slots={slots} selectedSlot={null} onSelect={vi.fn()} />);

        const tooSoonButton = screen.getByText('9 AM – 10 AM').closest('button');
        expect(tooSoonButton).toBeDisabled();
        expect(screen.getByText('Too soon')).toBeInTheDocument();

        const availableButton = screen.getByText('10:30 AM – 11:30 AM').closest('button');
        expect(availableButton).not.toBeDisabled();

        vi.useRealTimers();
    });
});
