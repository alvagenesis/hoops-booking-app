import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIBookingModal from '../../modals/AIBookingModal';
import { callGeminiAPI } from '../../lib/gemini';

// Mock lib
vi.mock('../../lib/gemini', () => ({
    callGeminiAPI: vi.fn(),
}));

const mockCourts = [
    { id: 'c1', name: 'Main Indoor Court' },
    { id: 'c2', name: 'Outdoor Street Court' }
];

describe('AIBookingModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and allows typing', async () => {
        const user = userEvent.setup();
        render(<AIBookingModal courts={mockCourts} onClose={vi.fn()} onSuccess={vi.fn()} />);

        const textarea = screen.getByPlaceholderText(/e\.g\., 'Book the outdoor street court/i);
        await user.type(textarea, 'Book main court tomorrow');
        expect(textarea.value).toBe('Book main court tomorrow');
    });

    it('shows verification step after successful AI call', async () => {
        const user = userEvent.setup();
        const mockParsed = {
            title: 'Tomorrow Session',
            courtId: 'c1',
            startYear: 2026,
            startMonth: 12,
            startDay: 1,
            endYear: 2026,
            endMonth: 12,
            endDay: 1
        };
        vi.mocked(callGeminiAPI).mockResolvedValue(mockParsed);

        render(<AIBookingModal courts={mockCourts} onClose={vi.fn()} onSuccess={vi.fn()} />);

        const textarea = screen.getByPlaceholderText(/e\.g\., 'Book the outdoor street court/i);
        await user.type(textarea, 'Book main court tomorrow');
        await user.click(screen.getByText('Analyze Request'));

        await waitFor(() => expect(screen.getByText('Here is what I found:')).toBeInTheDocument());
        expect(screen.getByText('Tomorrow Session')).toBeInTheDocument();
        expect(screen.getByText('Main Indoor Court')).toBeInTheDocument();
    });

    it('shows error if AI call fails', async () => {
        const user = userEvent.setup();
        vi.mocked(callGeminiAPI).mockRejectedValue(new Error('API Error'));

        render(<AIBookingModal courts={mockCourts} onClose={vi.fn()} onSuccess={vi.fn()} />);

        await user.type(screen.getByPlaceholderText(/e\.g\., 'Book the outdoor street court/i), 'something');
        await user.click(screen.getByText('Analyze Request'));

        await waitFor(() => expect(screen.getByText(/I couldn't quite get that/i)).toBeInTheDocument());
    });

    it('calls onSuccess when confirming parsed results', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        const mockParsed = {
            title: 'Test Booking',
            courtId: 'c2',
            startYear: 2026,
            startMonth: 1,
            startDay: 10,
            endYear: 2026,
            endMonth: 1,
            endDay: 10
        };
        vi.mocked(callGeminiAPI).mockResolvedValue(mockParsed);

        render(<AIBookingModal courts={mockCourts} onClose={vi.fn()} onSuccess={onSuccess} />);

        await user.type(screen.getByPlaceholderText(/e\.g\., 'Book the outdoor street court/i), 'Outdoor on Jan 10');
        await user.click(screen.getByText('Analyze Request'));

        await waitFor(() => screen.getByText('Confirm & Continue'));
        await user.click(screen.getByText('Confirm & Continue'));

        expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Test Booking',
            courtId: 'c2'
        }));
    });
});
