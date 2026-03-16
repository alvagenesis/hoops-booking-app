import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentModal from '../../modals/PaymentModal';

const defaultProps = {
  bookingInfo: { totalAmount: 800 },
  onClose: vi.fn(),
  onConfirm: vi.fn(),
};

describe('PaymentModal', () => {
  it('renders payment options', () => {
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByText('Payment Options')).toBeInTheDocument();
    expect(screen.getByText('Pay in Full')).toBeInTheDocument();
    expect(screen.getByText('Partial (50% Deposit)')).toBeInTheDocument();
  });

  it('shows full amount by default', () => {
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByText('Pay ₱800')).toBeInTheDocument();
  });

  it('shows partial amount when selected', async () => {
    const user = userEvent.setup();
    render(<PaymentModal {...defaultProps} />);
    await user.click(screen.getByText('Partial (50% Deposit)'));
    expect(screen.getByText('Pay ₱400')).toBeInTheDocument();
  });

  it('shows payment methods', () => {
    render(<PaymentModal {...defaultProps} />);
    expect(screen.getByText('GCash')).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Credit/Debit Card (Stripe)')).toBeInTheDocument();
  });

  it('calls onConfirm with payment data', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<PaymentModal {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByText('Pay ₱800'));
    expect(onConfirm).toHaveBeenCalledWith({
      paymentStatus: 'full',
      paidAmount: 800,
      paymentMethod: 'gcash',
    });
  });

  it('calls onClose when Back is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PaymentModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByText('Back'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
