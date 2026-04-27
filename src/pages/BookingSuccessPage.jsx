import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, User, Phone, CreditCard, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { getPaymentReviewMeta, getPaymentStatusMeta, normalizePaymentState } from '../lib/paymentUtils';

function formatDateRange(dates) {
    if (!dates?.length) return '';
    const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dates.length === 1) {
        return new Date(`${dates[0]}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return `${fmt(dates[0])} - ${new Date(`${dates[dates.length - 1]}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

const BookingSuccessPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!state?.booking) {
            navigate('/book', { replace: true });
        }
    }, [state, navigate]);

    if (!state?.booking) return null;

    const booking = normalizePaymentState(state.booking);
    const { court, dates, slots } = state;
    const firstSlot = Array.isArray(slots) ? slots[0] : slots;
    const lastSlot = Array.isArray(slots) ? slots[slots.length - 1] : slots;
    const timeLabel = firstSlot && lastSlot
        ? `${firstSlot.label?.split('–')[0]?.trim() ?? firstSlot.label?.split('-')[0]?.trim()} - ${lastSlot.label?.split('–')[1]?.trim() ?? lastSlot.end}`
        : firstSlot?.label;
    const refNumber = booking.id ? booking.id.replace(/-/g, '').slice(0, 8).toUpperCase() : null;
    const paymentMeta = getPaymentStatusMeta(booking.payment_status);
    const reviewMeta = getPaymentReviewMeta(booking.payment_review_status);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-gray-200 flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-md space-y-5">
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-100">Booking Submitted!</h1>
                    <p className="text-sm text-gray-500">Your reservation is now in payment verification. Staff will review the submitted payment and confirm your booking once everything is checked.</p>
                </div>

                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: court?.color ?? '#3b82f6' }} />
                        <div>
                            <p className="font-semibold text-gray-100">{court?.name ?? 'Court'}</p>
                            {court?.description && <p className="text-xs text-gray-500">{court.description}</p>}
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        {dates?.length > 0 && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span>{formatDateRange(dates)}</span>
                                {dates.length > 1 && <span className="text-gray-600">({dates.length} days)</span>}
                            </div>
                        )}
                        {timeLabel && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span>{timeLabel}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-400">
                            <CreditCard className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span>Total: <span className="text-gray-200 font-semibold">P{booking.total_amount?.toLocaleString()}</span></span>
                            {booking.paid_amount > 0 && (
                                <span className="text-gray-600 text-xs">· P{booking.paid_amount?.toLocaleString()} verified</span>
                            )}
                            {booking.pending_payment_amount > 0 && (
                                <span className="text-yellow-500 text-xs">· P{booking.pending_payment_amount?.toLocaleString()} submitted</span>
                            )}
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${paymentMeta.bg}`}>
                        <span className={paymentMeta.color}>{paymentMeta.text}</span>
                        <span className={reviewMeta.color}>· {reviewMeta.text}</span>
                    </div>
                </div>

                {(booking.customer_name || booking.customer_phone) && (
                    <div className="bg-[#111116] border border-gray-800 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact on file</p>
                        {booking.customer_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <User className="w-4 h-4 text-gray-500" />
                                <span>{booking.customer_name}</span>
                            </div>
                        )}
                        {booking.customer_phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span>{booking.customer_phone}</span>
                            </div>
                        )}
                    </div>
                )}

                {refNumber && (
                    <div className="bg-[#111116] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Booking Reference</p>
                            <p className="text-lg font-mono font-bold text-gray-100 tracking-widest">{refNumber}</p>
                        </div>
                        <p className="text-xs text-gray-600 text-right max-w-[140px]">Use this to check your booking status later</p>
                    </div>
                )}

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-300 mb-1">What happens next?</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Staff will review your payment and booking details. Save your reference number above so you can check the verification result and settle any remaining balance later.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={() => navigate('/book')} className="w-full gap-2">
                        Book Another Slot <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/my-booking')} className="w-full text-blue-400 hover:text-blue-300">
                        Check Booking Status
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BookingSuccessPage;
