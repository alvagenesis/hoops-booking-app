import { CalendarIcon, MapPin, X, User, Clock, Trash2, CheckCircle2, AlertTriangle, Wallet, Ban, CreditCard } from 'lucide-react';
import Button from '../components/ui/Button';
import ModalOverlay from '../components/ui/ModalOverlay';
import { formatDate } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { canSubmitPayment, derivePaymentStatus, getPaymentReviewMeta, normalizePaymentState } from '../lib/paymentUtils';

const ReservationDetailModal = ({ reservation, onClose, onCancel, onAdminUpdate, onPay }) => {
    const { role, user } = useAuth();
    const isAdmin = role === 'admin';
    const isOwner = user?.id === reservation.user_id;
    const normalizedReservation = normalizePaymentState(reservation);
    const hasPendingPaymentReview = normalizedReservation.payment_review_status === 'pending'
        && normalizedReservation.pending_payment_amount > 0;
    const isFullyPaidBooking = normalizedReservation.payment_status === 'paid'
        && normalizedReservation.payment_review_status === 'approved'
        && normalizedReservation.pending_payment_amount === 0;

    const canPay = onPay
        && isOwner
        && !isAdmin
        && canSubmitPayment(normalizedReservation);

    const { start, end } = getReservationDateRange(reservation);
    const court = reservation.courts;
    return (
        <ModalOverlay onClose={onClose} panelClassName="lg:max-w-4xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#16161c] rounded-t-2xl">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-400" /> Reservation Details
                </h3>
                <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <h4 className="text-2xl font-bold text-gray-100">{reservation.title || 'Court Booking'}</h4>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyles(reservation.status)}`}>
                            {reservation.status}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{normalizedReservation.payment_status || 'unpaid'} Payment · {getPaymentReviewMeta(normalizedReservation.payment_review_status).text}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] gap-6 items-start">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-3 bg-[#1a1a24] rounded-xl border border-gray-800/50">
                                <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Date & Duration</p>
                                    <p className="text-sm text-gray-200 mt-0.5">
                                        {start ? formatDate(start) : 'Date pending'}
                                        {start && end && start.getTime() !== end.getTime() && ` - ${formatDate(end)}`}
                                    </p>
                                    {reservation.start_time && reservation.end_time && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {formatTime12h(reservation.start_time)} - {formatTime12h(reservation.end_time)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-[#1a1a24] rounded-xl border border-gray-800/50">
                                <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Court Facility</p>
                                    <p className="text-sm text-gray-200 mt-0.5">{court?.name || 'Main Court'}</p>
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2">
                                <p className="text-xs text-blue-400/70 font-medium flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Customer Information (Admin Only)
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div>
                                        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Name</p>
                                        <p className="text-sm text-gray-200 truncate">{reservation.customer_name || (reservation.user_id ? `User ...${reservation.user_id.slice(-6)}` : 'Guest')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Phone</p>
                                        <p className="text-sm text-gray-200 truncate">{reservation.customer_phone || <span className="text-gray-600">-</span>}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Email</p>
                                        <p className="text-sm text-gray-200 truncate">{reservation.customer_email || <span className="text-gray-600">-</span>}</p>
                                    </div>
                                    {reservation.is_guest_booking && reservation.id && (
                                        <div>
                                            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Ref #</p>
                                            <p className="text-sm text-gray-200 font-mono">{reservation.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="bg-[#0d0d10] border border-gray-800/50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Charged</span>
                            <span className="text-gray-200">P{reservation.total_amount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Verified Amount</span>
                            <span className="text-green-500">P{normalizedReservation.paid_amount?.toLocaleString() || '0'}</span>
                        </div>
                        {normalizedReservation.pending_payment_amount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Pending Review</span>
                                <span className="text-yellow-400">P{normalizedReservation.pending_payment_amount?.toLocaleString() || '0'}</span>
                            </div>
                        )}
                        {reservation.reservation_addons?.length > 0 && (
                            <div className="pt-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Add-ons</p>
                                <div className="space-y-1">
                                    {reservation.reservation_addons.map((addon) => (
                                        <div key={addon.id ?? addon.amenity_id} className="flex justify-between gap-3 text-sm">
                                            <span className="text-gray-400">{addon.amenities?.name ?? addon.amenity_id}</span>
                                            <span className="text-gray-300 whitespace-nowrap">P{parseFloat(addon.price_at_booking || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(reservation.pending_payment_notes || reservation.payment_notes) && (
                            <div className="pt-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Notes</p>
                                <p className="text-sm text-gray-300 mt-1">{reservation.pending_payment_notes || reservation.payment_notes}</p>
                            </div>
                        )}
                        {(reservation.pending_payment_proof_url || reservation.payment_proof_url) && (
                            <div className="pt-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Proof</p>
                                <a href={reservation.pending_payment_proof_url || reservation.payment_proof_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 mt-1 inline-block">
                                    View uploaded proof
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && onAdminUpdate && (
                    <div className="bg-[#16161c] border border-gray-800 rounded-xl p-4 space-y-3">
                        <h5 className="text-sm font-semibold text-gray-200">Admin Actions</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                    {hasPendingPaymentReview && (
                                        <Button
                                            variant="secondary"
                                            className="gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
                                            onClick={() => {
                                                const approvedPaidAmount = normalizedReservation.paid_amount + normalizedReservation.pending_payment_amount;
                                                onAdminUpdate(reservation.id, {
                                                    payment_status: derivePaymentStatus(normalizedReservation.total_amount, approvedPaidAmount),
                                                    payment_review_status: 'approved',
                                                    payment_reviewed_at: new Date().toISOString(),
                                                    paid_amount: approvedPaidAmount,
                                                    payment_method: normalizedReservation.pending_payment_method || normalizedReservation.payment_method,
                                                    payment_notes: normalizedReservation.pending_payment_notes || normalizedReservation.payment_notes,
                                                    payment_proof_url: normalizedReservation.pending_payment_proof_url || normalizedReservation.payment_proof_url,
                                                    pending_payment_amount: 0,
                                                    pending_payment_method: null,
                                                    pending_payment_notes: '',
                                                    pending_payment_proof_url: null,
                                                    status: 'confirmed',
                                                    confirmed_at: new Date().toISOString(),
                                                });
                                            }}
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Approve Payment
                                        </Button>
                                    )}
                                    {!isFullyPaidBooking && !hasPendingPaymentReview && (
                                        <Button variant="secondary" className="gap-2" onClick={() => onAdminUpdate(reservation.id, { payment_status: 'paid', payment_review_status: 'approved', paid_amount: reservation.total_amount, pending_payment_amount: 0, pending_payment_method: null, pending_payment_notes: '', pending_payment_proof_url: null, status: 'confirmed', confirmed_at: new Date().toISOString() })}>
                                            <Wallet className="w-4 h-4" /> Mark Fully Paid
                                        </Button>
                                    )}
                                    {!isFullyPaidBooking && hasPendingPaymentReview && (
                                        <Button variant="secondary" className="gap-2" onClick={() => onAdminUpdate(reservation.id, { payment_review_status: 'rejected', pending_payment_amount: 0, pending_payment_method: null, pending_payment_notes: '', pending_payment_proof_url: null, status: normalizedReservation.paid_amount > 0 ? 'confirmed' : 'pending_verification' })}>
                                            <AlertTriangle className="w-4 h-4" /> Reject Payment
                                        </Button>
                                    )}
                            <Button variant="secondary" className="gap-2" onClick={() => onAdminUpdate(reservation.id, { status: 'completed' })}>
                                <CheckCircle2 className="w-4 h-4" /> Mark Completed
                            </Button>
                            <Button variant="secondary" className="gap-2" onClick={() => onAdminUpdate(reservation.id, { status: 'no_show' })}>
                                <Ban className="w-4 h-4" /> Mark No-show
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {canPay && (
                            <Button className="gap-2" onClick={() => onPay(normalizedReservation)}>
                                <CreditCard className="w-4 h-4" /> Pay Balance
                            </Button>
                        )}
                        {(isAdmin || isOwner) && reservation.status !== 'cancelled' && (
                            <Button
                                variant="secondary"
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 gap-2"
                                onClick={() => onCancel(reservation.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                                {isAdmin ? 'Cancel Reservation (Admin)' : 'Cancel My Booking'}
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-end sm:justify-end">
                        <Button variant="ghost" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
};

function getReservationDateRange(reservation) {
    if (reservation?.reservation_days?.length) {
        const sortedDates = reservation.reservation_days
            .map((day) => new Date(`${day.date}T00:00:00`))
            .filter((date) => !Number.isNaN(date.getTime()))
            .sort((a, b) => a - b);

        return {
            start: sortedDates[0] || null,
            end: sortedDates[sortedDates.length - 1] || sortedDates[0] || null,
        };
    }

    const start = reservation?.start_date ? new Date(reservation.start_date) : (reservation?.start ? new Date(reservation.start) : null);
    const end = reservation?.end_date ? new Date(reservation.end_date) : (reservation?.end ? new Date(reservation.end) : start);

    return {
        start: start && !Number.isNaN(start.getTime()) ? start : null,
        end: end && !Number.isNaN(end.getTime()) ? end : (start && !Number.isNaN(start.getTime()) ? start : null),
    };
}

function formatTime12h(time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function statusBadgeStyles(status) {
    switch (status) {
        case 'confirmed':
            return 'bg-green-500/10 text-green-400';
        case 'pending_verification':
            return 'bg-yellow-500/10 text-yellow-400';
        case 'awaiting_payment':
            return 'bg-orange-500/10 text-orange-400';
        case 'completed':
            return 'bg-blue-500/10 text-blue-400';
        case 'cancelled':
            return 'bg-red-500/10 text-red-400';
        case 'no_show':
            return 'bg-slate-500/10 text-slate-400';
        default:
            return 'bg-yellow-500/10 text-yellow-400';
    }
}

export default ReservationDetailModal;
