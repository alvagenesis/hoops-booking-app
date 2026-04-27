import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeSlotSelection from '../../../components/booking/TimeSlotSelection';

const mockSlots = [
    { start: '08:00', end: '09:00', label: '8 AM - 9 AM' },
    { start: '09:00', end: '10:00', label: '9 AM - 10 AM' },
    { start: '10:00', end: '11:00', label: '10 AM - 11 AM' },
];

afterEach(() => {
    vi.useRealTimers();
});

describe('TimeSlotSelection', () => {
    it('renders the title and slots', () => {
        render(<TimeSlotSelection slots={mockSlots} selectedSlots={[]} onSelect={vi.fn()} />);
        expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
        expect(screen.getByText('8 AM - 9 AM')).toBeInTheDocument();
        expect(screen.getByText('9 AM - 10 AM')).toBeInTheDocument();
        expect(screen.getByText('10 AM - 11 AM')).toBeInTheDocument();
    });

    it('shows empty state when no slots provided', () => {
        render(<TimeSlotSelection slots={[]} selectedSlots={[]} onSelect={vi.fn()} />);
        expect(screen.getByText(/No time slots available/)).toBeInTheDocument();
    });

    it('calls onSelect when a slot is clicked', async () => {
        vi.setSystemTime(new Date(2026, 1, 26, 0, 0));
        const user = userEvent.setup();
        const onSelect = vi.fn();

        render(<TimeSlotSelection slots={mockSlots} selectedSlots={[]} onSelect={onSelect} />);

        await user.click(screen.getByTestId('slot-09:00'));
        expect(onSelect).toHaveBeenCalledWith([mockSlots[1]]);
    });

    it('highlights the selected slot', () => {
        render(<TimeSlotSelection slots={mockSlots} selectedSlots={[mockSlots[1]]} onSelect={vi.fn()} />);
        const selectedButton = screen.getByText('9 AM - 10 AM').closest('button');
        expect(selectedButton).toHaveClass('border-blue-500');
    });

    it('disables and marks booked slots', () => {
        const bookedSlots = [{ start_time: '09:00', end_time: '10:00' }];

        render(<TimeSlotSelection slots={mockSlots} selectedSlots={[]} onSelect={vi.fn()} bookedSlots={bookedSlots} />);

        const bookedButton = screen.getByText('9 AM - 10 AM').closest('button');
        expect(bookedButton).toBeDisabled();
        expect(screen.getByText('Booked')).toBeInTheDocument();
    });

    it('marks slots as too soon if they are within 30 minutes', () => {
        vi.setSystemTime(new Date(2026, 1, 26, 8, 45));

        const slots = [
            { start: '09:00', end: '10:00', label: '9 AM - 10 AM' },
            { start: '09:30', end: '10:30', label: '9:30 AM - 10:30 AM' },
        ];

        render(
            <TimeSlotSelection
                slots={slots}
                selectedSlots={[]}
                onSelect={vi.fn()}
                selectedDate={new Date(2026, 1, 26)}
            />
        );

        const tooSoonButton = screen.getByText('9 AM - 10 AM').closest('button');
        expect(tooSoonButton).toBeDisabled();
        expect(screen.getByText('Too soon')).toBeInTheDocument();

        const availableButton = screen.getByText('9:30 AM - 10:30 AM').closest('button');
        expect(availableButton).not.toBeDisabled();
    });

    it('disables past slots without showing an extra status label', () => {
        vi.setSystemTime(new Date(2026, 1, 26, 8, 45));

        const slots = [
            { start: '08:00', end: '09:00', label: '8 AM - 9 AM' },
            { start: '10:00', end: '11:00', label: '10 AM - 11 AM' },
        ];

        render(
            <TimeSlotSelection
                slots={slots}
                selectedSlots={[]}
                onSelect={vi.fn()}
                selectedDate={new Date(2026, 1, 26)}
            />
        );

        const pastButton = screen.getByText('8 AM - 9 AM').closest('button');
        expect(pastButton).toBeDisabled();
        expect(screen.queryByText('Passed')).not.toBeInTheDocument();

        const futureButton = screen.getByText('10 AM - 11 AM').closest('button');
        expect(futureButton).not.toBeDisabled();
    });
});
