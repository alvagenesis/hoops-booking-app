import { useState } from 'react';
import { Calendar, Clock, MapPin, X, Loader2, CreditCard, DollarSign } from 'lucide-react';
import { useReservations } from '../hooks/useReservations';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import PaymentModal from '../modals/PaymentModal';

const TABS = ['upcoming', 'past', 'cancelled'];

const MyBookingsPage = () => {
    const navigate = useNavigate();
    const { reservations, loading, cancelReservation, payReservation } = useReservations();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [detailId, setDetailId] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [pendingPaymentRes, setPendingPaymentRes] = useState(null);
    const [isPaying, setIsPaying] = useState(false);

    const now = new Date();

    const categorized = {
        upcoming: reservations.filter(r => r.status !== 'cancelled' && r.status !== 'completed' && isUpcoming(r, now)),
        past: reservations.filter(r => r.status === 'completed' || (!['cancelled'].includes(r.status) && !isUpcoming(r, now))),
        cancelled: reservations.filter(r => r.status === 'cancelled'),
    };

    const handleCancel = async (id) => {
        setCancelling(id);
        try {
            await cancelReservation(id);
        } catch { /* swallow */ }
        setCancelling(null);
    };

    const handleConfirmPayment = async ({ paidAmount, paymentMethod, paymentNotes, paymentProofFile }) => {
        if (!pendingPaymentRes) return;
        setIsPaying(true);
        try {
            await payReservation(pendingPaymentRes.id, paidAmount, paymentMethod, { paymentNotes, paymentProofFile });
            setPendingPaymentRes(null);
            setDetailId(null);
        } catch (err) {
            console.error('Payment failed:', err);
        } finally {
            setIsPaying(false);
        }
    };

    const detailRes = detailId ? reservations.find(r => r.id === detailId) : null;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-5 w-32 bg-gray-800/60 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-gray-800/60 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-36 bg-gray-800/60 rounded-lg animate-pulse" />
                </div>
                <div className="flex gap-1 bg-[#111116] border border-gray-800 rounded-lg p-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex-1 h-9 bg-gray-800/40 rounded-md animate-pulse" />
                    ))}
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-[#111116] border border-gray-800 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-1 h-12 rounded-full bg-gray-700 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 bg-gray-800/60 rounded animate-pulse" />
                                    <div className="h-3 w-28 bg-gray-800/60 rounded animate-pulse" />
                                    <div className="flex gap-4 mt-2">
                                        <div className="h-3 w-24 bg-gray-800/60 rounded animate-pulse" />
                                        <div className="h-3 w-20 bg-gray-800/60 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="h-5 w-16 bg-gray-800/60 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">My Bookings</h2>
                    <p className="text-sm text-gray-500">{reservations.length} total booking{reservations.length !== 1 ? 's' : ''}</p>
                </div>
                <Button onClick={() => navigate('/book')} className="gap-2">
                    <Calendar className="w-4 h-4" /> New Booking
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#111116] border border-gray-800 rounded-lg p-1">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${activeTab === tab ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {tab} ({categorized[tab].length})
                    </button>
                ))}
            </div>

            {/* Booking Cards */}
            <div className="space-y-3">
                {categorized[activeTab].length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                        No {activeTab} bookings.
                    </div>
                ) : (
                    categorized[activeTab].map(res => {
                        const court = res.courts || {};
                        const dates = res.reservation_days || [];
                        const firstDate = dates[0]?.date;
                        return (
                            <div
                                key={res.id}
                                className="bg-[#111116] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer"
                                onClick={() => setDetailId(res.id)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: court.color || '#666' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-gray-100 truncate">{res.title || 'Court Booking'}</h3>
                                            <StatusBadge status={res.status} />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-gray-500">{court.name || 'Unknown Court'}</p>
                                            <PaymentBadge status={res.payment_status} />
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{firstDate || '—'}{dates.length > 1 && ` +${dates.length - 1} more`}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{res.start_time} – {res.end_time}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-gray-100">₱{(res.total_amount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                {(res.status === 'pending' || res.status === 'confirmed' || res.status === 'awaiting_payment') && activeTab === 'upcoming' && (
                                    <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
                                        <div className="text-[10px] text-gray-500">
                                            {res.payment_status !== 'paid' && (
                                                <span>Balance: ₱{((res.total_amount || 0) - (res.paid_amount || 0)).toLocaleString()}</span>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            {res.payment_status !== 'paid' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPendingPaymentRes(res); }}
                                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <CreditCard className="w-3 h-3" /> Pay Now
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCancel(res.id); }}
                                                disabled={cancelling === res.id}
                                                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                                            >
                                                {cancelling === res.id ? 'Cancelling...' : 'Cancel Booking'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Detail Sheet */}
            {detailRes && (
                <DetailSheet
                    reservation={detailRes}
                    onClose={() => setDetailId(null)}
                    onCancel={handleCancel}
                    onPay={() => setPendingPaymentRes(detailRes)}
                    cancelling={cancelling}
                />
            )}

            {/* Payment Modal */}
            {pendingPaymentRes && (
                <PaymentModal
                    bookingInfo={{
                        totalAmount: pendingPaymentRes.total_amount - (pendingPaymentRes.paid_amount || 0),
                        originalTotal: pendingPaymentRes.total_amount
                    }}
                    onClose={() => setPendingPaymentRes(null)}
                    onConfirm={handleConfirmPayment}
                />
            )}
        </div>
    );
};

function DetailSheet({ reservation, onClose, onCancel, onPay, cancelling }) {
    const court = reservation.courts || {};
    const dates = reservation.reservation_days || [];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#111116] border-l border-gray-800 h-full overflow-y-auto p-6 space-y-5 animate-slide-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-100">Booking Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-14 rounded-full" style={{ backgroundColor: court.color || '#666' }} />
                    <div>
                        <p className="font-semibold text-gray-100">{reservation.title || 'Court Booking'}</p>
                        <p className="text-sm text-gray-500">{court.name || 'Unknown Court'}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <InfoRow icon={Clock} label="Time" value={`${reservation.start_time} – ${reservation.end_time}`} />
                    <InfoRow icon={Calendar} label="Status"><StatusBadge status={reservation.status} /></InfoRow>
                    <InfoRow icon={DollarSign} label="Payment"><PaymentBadge status={reservation.payment_status} /></InfoRow>
                    {reservation.customer_name && <InfoRow icon={MapPin} label="Booked By" value={reservation.customer_name} />}
                    {reservation.customer_phone && <InfoRow icon={MapPin} label="Phone" value={reservation.customer_phone} />}
                    {reservation.customer_email && <InfoRow icon={MapPin} label="Email" value={reservation.customer_email} />}
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Dates</p>
                        <div className="space-y-1">
                            {dates.map(d => (
                                <div key={d.id} className="text-sm text-gray-300 bg-[#16161c] rounded px-3 py-1.5">
                                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            ))}
                        </div>
                    </div>
                    {reservation.notes && <InfoRow icon={MapPin} label="Notes" value={reservation.notes} />}
                    {reservation.payment_notes && <InfoRow icon={CreditCard} label="Payment" value={reservation.payment_notes} />}
                    {reservation.payment_proof_url && (
                        <div className="text-sm">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Payment Proof</p>
                            <a href={reservation.payment_proof_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                                View uploaded proof
                            </a>
                        </div>
                    )}
                    <div className="border-t border-gray-800 pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total Amount</span>
                            <span className="font-bold text-gray-100">₱{(reservation.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Paid to date</span>
                            <span className="font-medium text-green-400">₱{(reservation.paid_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1">
                            <span className="text-gray-500 italic">Remaining Balance</span>
                            <span className="text-gray-300 font-semibold">₱{((reservation.total_amount || 0) - (reservation.paid_amount || 0)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    {reservation.payment_status !== 'paid' && (reservation.status === 'pending' || reservation.status === 'confirmed' || reservation.status === 'awaiting_payment') && (
                        <Button
                            onClick={onPay}
                            className="w-full gap-2"
                        >
                            <CreditCard className="w-4 h-4" /> Pay Balance
                        </Button>
                    )}
                    {(reservation.status === 'pending' || reservation.status === 'confirmed' || reservation.status === 'awaiting_payment') && (
                        <button
                            onClick={() => onCancel(reservation.id)}
                            disabled={cancelling === reservation.id}
                            className="w-full py-2.5 text-sm font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                            {cancelling === reservation.id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// eslint-disable-next-line no-unused-vars
function InfoRow({ icon: Icon, label, value, children }) {
    return (
        <div className="flex items-center gap-3 text-sm">
            <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 w-16">{label}</span>
            {children || <span className="text-gray-200">{value}</span>}
        </div>
    );
}

function PaymentBadge({ status }) {
    if (!status) return null;
    const styles = {
        unpaid: 'bg-red-500/10 text-red-400 border-red-500/20',
        partial: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        for_verification: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        paid: 'bg-green-500/10 text-green-400 border-green-500/20',
        rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${styles[status]}`}>
            <DollarSign className="w-2.5 h-2.5" /> {status}
        </span>
    );
}

function StatusBadge({ status }) {
    const styles = {
        pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        awaiting_payment: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
        completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
        no_show: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
}

function isUpcoming(res, now) {
    const dates = res.reservation_days || [];
    if (dates.length > 0) {
        const lastDate = new Date(`${dates[dates.length - 1]?.date}T23:59:59`);
        return !Number.isNaN(lastDate.getTime()) ? lastDate >= now : true;
    }

    const fallbackStart = res.start_date ? new Date(`${res.start_date}T23:59:59`) : null;
    const fallbackEnd = res.end_date ? new Date(`${res.end_date}T23:59:59`) : fallbackStart;
    const compareDate = fallbackEnd && !Number.isNaN(fallbackEnd.getTime()) ? fallbackEnd : fallbackStart;

    if (compareDate && !Number.isNaN(compareDate.getTime())) {
        return compareDate >= now;
    }

    return true;
}

export default MyBookingsPage;
