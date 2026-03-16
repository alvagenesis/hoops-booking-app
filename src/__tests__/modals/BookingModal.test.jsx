import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingModal from '../../modals/BookingModal';

const mockCourts = [
  { id: 'c1', name: 'Main Indoor Court', type: 'Indoor', pricePerHour: 50, pricePerDay: 400 },
  { id: 'c2', name: 'Outdoor Street Court', type: 'Outdoor', pricePerHour: 30, pricePerDay: 200 },
];

const defaultProps = {
  courts: mockCourts,
  onClose: vi.fn(),
  selectedDates: { start: new Date(2026, 1, 10), end: new Date(2026, 1, 12) },
  initialData: null,
  onProceed: vi.fn(),
};

describe('BookingModal', () => {
  it('renders the booking form', () => {
    render(<BookingModal {...defaultProps} />);
    expect(screen.getByText('New Booking')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Weekend Tournament')).toBeInTheDocument();
  });

  it('displays court options', () => {
    render(<BookingModal {...defaultProps} />);
    expect(screen.getAllByText(/Main Indoor Court/).length).toBeGreaterThanOrEqual(1);
  });

  it('calculates and shows total amount', () => {
    render(<BookingModal {...defaultProps} />);
    // 3 days × ₱400/day = ₱1,200
    expect(screen.getByText('₱1,200')).toBeInTheDocument();
  });

  it('pre-fills from initialData', () => {
    const initialData = {
      title: 'AI Generated Game',
      courtId: 'c2',
      start: new Date(2026, 1, 10),
      end: new Date(2026, 1, 10),
    };
    render(<BookingModal {...defaultProps} initialData={initialData} />);
    expect(screen.getByDisplayValue('AI Generated Game')).toBeInTheDocument();
  });

  it('calls onProceed with booking data on submit', async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();
    render(<BookingModal {...defaultProps} onProceed={onProceed} />);

    await user.type(screen.getByPlaceholderText('e.g., Weekend Tournament'), 'My Game');
    await user.click(screen.getByText('Proceed to Payment'));

    expect(onProceed).toHaveBeenCalledTimes(1);
    expect(onProceed).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Game',
      courtId: 'c1',
    }));
  });

  it('disables submit when title is empty', () => {
    render(<BookingModal {...defaultProps} />);
    expect(screen.getByText('Proceed to Payment')).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BookingModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
