import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, CreditCard, DollarSign, Hash, History, User, X } from 'lucide-react';
import { useReservations } from '../hooks/useReservations';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import PaymentModal from '../modals/PaymentModal';
import ReservationDetailModal from '../modals/ReservationDetailModal';
import { canSubmitPayment, getPaymentReviewMeta, normalizePaymentState } from '../lib/paymentUtils';
import ModalOverlay from '../components/ui/ModalOverlay';
import { formatBookingDate, formatCompactTimeRange } from '../lib/utils';
const TABS = ['upcoming', 'past', 'cancelled'];
const DESKTOP_PAGE_SIZE = 10;
const MOBILE_BATCH_SIZE = 8;
const ADMIN_FILTERS = [
    { id: 'all', label: 'All bookings' },
    { id: 'needs_admin_action', label: 'Needs admin action' },
    { id: 'payment_reviews', label: 'Payment reviews' },
    { id: 'rejected_bookings', label: 'Rejected bookings' },
];
const PENDING_BOOKING_STATUSES = ['pending_verification', 'pending', 'awaiting_payment'];

const MyBookingsPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { role } = useAuth();
    const { reservations, loading, lastUpdatedAt, reservationWindow, cancelReservation, updateReservation, payReservation } = useReservations();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [desktopPage, setDesktopPage] = useState(1);
    const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_BATCH_SIZE);
    const [detailId, setDetailId] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [pendingPaymentRes, setPendingPaymentRes] = useState(null);
    const [logReservation, setLogReservation] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const isMobile = useIsMobile();
    const loadMoreRef = useRef(null);
    const isAdmin = role === 'admin';
    const requestedAdminFilter = searchParams.get('filter') || 'all';
    const adminFilter = isAdmin && ADMIN_FILTERS.some(filter => filter.id === requestedAdminFilter)
        ? requestedAdminFilter
        : 'all';

    const now = new Date();

    const filteredReservations = reservations.filter(reservation => matchesAdminFilter(reservation, adminFilter));

    const categorized = {
        upcoming: filteredReservations.filter(r => r.status !== 'cancelled' && r.status !== 'completed' && isUpcoming(r, now)),
        past: filteredReservations.filter(r => r.status === 'completed' || (!['cancelled'].includes(r.status) && !isUpcoming(r, now))),
        cancelled: filteredReservations.filter(r => r.status === 'cancelled'),
    };
    const activeReservations = categorized[activeTab];
    const totalPages = Math.max(1, Math.ceil(activeReservations.length / DESKTOP_PAGE_SIZE));
    const currentDesktopPage = Math.min(desktopPage, totalPages);
    const visibleReservations = isMobile
        ? activeReservations.slice(0, mobileVisibleCount)
        : activeReservations.slice((currentDesktopPage - 1) * DESKTOP_PAGE_SIZE, currentDesktopPage * DESKTOP_PAGE_SIZE);
    const hasMoreMobileRows = isMobile && mobileVisibleCount < activeReservations.length;

    useEffect(() => {
        setDesktopPage(1);
        setMobileVisibleCount(MOBILE_BATCH_SIZE);
    }, [activeTab, reservations.length, adminFilter]);

    useEffect(() => {
        if (!isMobile || !hasMoreMobileRows || !loadMoreRef.current || typeof IntersectionObserver === 'undefined') {
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setMobileVisibleCount(count => Math.min(count + MOBILE_BATCH_SIZE, activeReservations.length));
            }
        }, { rootMargin: '160px' });

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [activeReservations.length, hasMoreMobileRows, isMobile]);

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

    const handleAdminFilterChange = (filterId) => {
        const nextParams = new URLSearchParams(searchParams);

        if (filterId === 'all') {
            nextParams.delete('filter');
        } else {
            nextParams.set('filter', filterId);
        }

        setSearchParams(nextParams, { replace: true });
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
                    <p className="text-sm text-gray-500">
                        {filteredReservations.length} of {reservations.length} booking{reservations.length !== 1 ? 's' : ''} from the {reservationWindow?.label || 'current window'}
                    </p>
                    {role === 'admin' && lastUpdatedAt && (
                        <p className="text-xs text-gray-600 mt-1">Last updated {formatLastUpdated(lastUpdatedAt)}</p>
                    )}
                </div>
                <Button onClick={() => navigate('/book')} className="gap-2">
                    <Calendar className="w-4 h-4" /> New Booking
                </Button>
            </div>

            {isAdmin && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin filter</p>
                    <div className="flex flex-wrap gap-2">
                        {ADMIN_FILTERS.map(filter => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => handleAdminFilterChange(filter.id)}
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${adminFilter === filter.id
                                    ? 'border-blue-500/40 bg-blue-600/20 text-blue-300'
                                    : 'border-gray-800 bg-[#111116] text-gray-400 hover:border-gray-700 hover:text-white'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                {activeReservations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                        No {activeTab} bookings.
                    </div>
                ) : (
                    visibleReservations.map(res => {
                        const court = res.courts || {};
                        const dates = res.reservation_days || [];
                        const firstDate = dates[0]?.date;
                        const dateLabel = formatBookingDate(firstDate);
                        const timeLabel = formatCompactTimeRange(res.start_time, res.end_time);
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
                                            <PaymentBadge status={normalizePaymentState(res).payment_status} reviewStatus={normalizePaymentState(res).payment_review_status} />
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateLabel || '—'}{dates.length > 1 && ` +${dates.length - 1} more`}</span>
                                            {timeLabel && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeLabel}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-gray-100">₱{(res.total_amount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                {(['pending_verification', 'pending', 'confirmed', 'awaiting_payment'].includes(res.status)) && activeTab === 'upcoming' && (
                                    <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
                                        <div className="text-[10px] text-gray-500">
                                            {res.payment_status !== 'paid' && (
                                                <span>Balance: ₱{((res.total_amount || 0) - (res.paid_amount || 0)).toLocaleString()}</span>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            {canSubmitPayment(normalizePaymentState(res)) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPendingPaymentRes(res); }}
                                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <CreditCard className="w-3 h-3" /> {res.status === 'confirmed' && res.payment_status === 'partial' && (res.paid_amount || 0) > 0 ? 'Pay Balance' : 'Resubmit'}
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCancel(res.id); }}
                                                disabled={cancelling === res.id}
                                                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                                            >
                                                {cancelling === res.id ? 'Cancelling...' : 'Cancel Booking'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setLogReservation(res); }}
                                                className="text-xs text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-1"
                                            >
                                                <History className="w-3 h-3" /> View Logs
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {activeReservations.length > 0 && (
                <>
                    <DesktopPagination
                        page={currentDesktopPage}
                        totalPages={totalPages}
                        totalItems={activeReservations.length}
                        pageSize={DESKTOP_PAGE_SIZE}
                        onPageChange={setDesktopPage}
                    />

                    <MobileLoadMore
                        loadMoreRef={loadMoreRef}
                        visibleCount={visibleReservations.length}
                        totalItems={activeReservations.length}
                        hasMore={hasMoreMobileRows}
                        onLoadMore={() => setMobileVisibleCount(count => Math.min(count + MOBILE_BATCH_SIZE, activeReservations.length))}
                    />
                </>
            )}

            {/* Detail Modal */}
            {detailRes && (
                <ReservationDetailModal
                    reservation={detailRes}
                    onClose={() => setDetailId(null)}
                    onCancel={(id) => { handleCancel(id); setDetailId(null); }}
                    onAdminUpdate={role === 'admin' ? async (id, updates) => {
                        await updateReservation(id, updates);
                        setDetailId(null);
                    } : undefined}
                    onPay={(res) => { setPendingPaymentRes(res); setDetailId(null); }}
                />
            )}

            {logReservation && (
                <BookingLogsModal
                    reservation={logReservation}
                    onClose={() => setLogReservation(null)}
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
                    loading={isPaying}
                    fullPaymentOnly={pendingPaymentRes.status === 'confirmed' && pendingPaymentRes.payment_status === 'partial' && (pendingPaymentRes.paid_amount || 0) > 0}
                    partialPaymentUsed={pendingPaymentRes.status === 'confirmed' && pendingPaymentRes.payment_status === 'partial' && (pendingPaymentRes.paid_amount || 0) > 0}
                />
            )}
        </div>
    );
};

function DesktopPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
    const pages = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
    const startItem = totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    if (totalPages <= 1) {
        return (
            <div className="hidden md:flex items-center justify-between border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-500">Showing {totalItems} booking{totalItems !== 1 ? 's' : ''}</p>
            </div>
        );
    }

    return (
        <div className="hidden md:flex items-center justify-between border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500">
                Showing {startItem}-{endItem} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-gray-800 px-3 text-xs font-medium text-gray-300 transition-colors hover:border-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                </button>
                <div className="flex items-center gap-1">
                    {pages.map((pageNumber, index) => (
                        pageNumber === 'ellipsis' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-xs text-gray-600">...</span>
                        ) : (
                            <button
                                key={pageNumber}
                                type="button"
                                onClick={() => onPageChange(pageNumber)}
                                className={`h-9 min-w-9 rounded-md border px-3 text-xs font-medium transition-colors ${pageNumber === page
                                    ? 'border-blue-500/40 bg-blue-600/20 text-blue-300'
                                    : 'border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                                    }`}
                            >
                                {pageNumber}
                            </button>
                        )
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-gray-800 px-3 text-xs font-medium text-gray-300 transition-colors hover:border-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function MobileLoadMore({ loadMoreRef, visibleCount, totalItems, hasMore, onLoadMore }) {
    return (
        <div className="md:hidden border-t border-gray-800 pt-4 text-center">
            <p className="text-xs text-gray-500">
                Showing {visibleCount} of {totalItems}
            </p>
            {hasMore ? (
                <div ref={loadMoreRef} className="pt-3">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        className="w-full rounded-md border border-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
                    >
                        Load more
                    </button>
                </div>
            ) : (
                <p className="pt-3 text-xs text-gray-600">All bookings loaded</p>
            )}
        </div>
    );
}

function buildPageNumbers(page, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) pages.push('ellipsis');

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        pages.push(pageNumber);
    }

    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);

    return pages;
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => (
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(max-width: 767px)').matches
            : false
    ));

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const handleChange = event => setIsMobile(event.matches);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    return isMobile;
}

function matchesAdminFilter(reservation, filter) {
    switch (filter) {
        case 'needs_admin_action':
            return reservation.payment_review_status === 'pending' || PENDING_BOOKING_STATUSES.includes(reservation.status);
        case 'payment_reviews':
            return reservation.payment_review_status === 'pending';
        case 'rejected_bookings':
            return reservation.payment_review_status === 'rejected';
        default:
            return true;
    }
}

function BookingLogsModal({ reservation, onClose }) {
    const logs = [...(reservation?.booking_logs || [])]
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const customerName = getReservationCustomerName(reservation);
    const referenceNumber = getReservationReferenceNumber(reservation);

    return (
        <ModalOverlay onClose={onClose} panelClassName="max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#16161c] rounded-t-2xl">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" /> Booking Logs
                </h3>
                <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <p className="text-sm font-medium text-gray-100">{reservation?.title || 'Court Booking'}</p>
                    <p className="text-xs text-gray-500 mt-1">Tracking booking changes and payment milestones.</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1.5 max-w-full rounded-md border border-gray-800 bg-[#111116] px-2 py-1 text-xs text-gray-300">
                            <User className="w-3 h-3 text-gray-500 shrink-0" />
                            <span className="truncate">{customerName}</span>
                        </span>
                        {referenceNumber && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-800 bg-[#111116] px-2 py-1 text-xs font-mono text-gray-300">
                                <Hash className="w-3 h-3 text-gray-500 shrink-0" />
                                {referenceNumber}
                            </span>
                        )}
                    </div>
                </div>

                {logs.length === 0 ? (
                    <div className="bg-[#111116] border border-gray-800 rounded-xl p-4 text-sm text-gray-400">
                        No booking logs found yet.
                    </div>
                ) : (
                    <div className="bg-[#111116] border border-gray-800 rounded-xl p-5 space-y-4">
                        {logs.map((log, index) => (
                            <div key={log.id ?? `${log.event_type}-${index}`} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1.5" />
                                    {index < logs.length - 1 && <div className="w-px flex-1 bg-gray-800 mt-2" />}
                                </div>
                                <div className="min-w-0 pb-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-gray-100">{log.title || 'Booking update'}</p>
                                        {(getLogActorLabel(log) || log.created_at) && (
                                            <span className="text-[11px] text-gray-500">
                                                {formatLogMeta(log)}
                                            </span>
                                        )}
                                    </div>
                                    {log.description && (
                                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{log.description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </ModalOverlay>
    );
}

function getLogActorLabel(log) {
    const metadata = log?.metadata || {};
    const actorName = typeof metadata.actor_name === 'string' ? metadata.actor_name.trim() : '';

    if (!actorName) {
        return '';
    }

    return actorName;
}

function formatLogMeta(log) {
    const actorLabel = getLogActorLabel(log);
    const timestamp = formatLogTimestamp(log?.created_at);

    if (actorLabel && timestamp) {
        return `by ${actorLabel} - ${timestamp}`;
    }

    if (actorLabel) {
        return `by ${actorLabel}`;
    }

    return timestamp;
}

function getReservationCustomerName(reservation) {
    const name = reservation?.customer_name?.trim();

    if (name) {
        return reservation?.is_guest_booking ? `${name} (guest)` : name;
    }

    if (reservation?.user_id) {
        return `User ...${reservation.user_id.slice(-6)}`;
    }

    return 'Guest';
}

function getReservationReferenceNumber(reservation) {
    if (!reservation?.id) {
        return '';
    }

    return reservation.id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function formatLogTimestamp(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const dateLabel = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    });
    const timeLabel = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).toLowerCase();

    return `${dateLabel.replace(/\//g, '.')} ${timeLabel}`;
}

function formatLastUpdated(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }).toLowerCase();
}


function PaymentBadge({ status, reviewStatus }) {
    if (!status) return null;
    const styles = {
        unpaid: 'bg-red-500/10 text-red-400 border-red-500/20',
        partial: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        paid: 'bg-green-500/10 text-green-400 border-green-500/20',
        rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    const reviewMeta = getPaymentReviewMeta(reviewStatus);
    const isRejected = reviewStatus === 'rejected';
    if (isRejected) {
        status = reviewMeta.text;
    }
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${isRejected ? styles.rejected : (styles[status] || styles.unpaid)}`}>
            <DollarSign className="w-2.5 h-2.5" /> {status} {reviewStatus === 'pending' ? `· ${reviewMeta.text}` : ''}
        </span>
    );
}

function StatusBadge({ status }) {
    const styles = {
        pending_verification: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        awaiting_payment: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
        completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
        no_show: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending_verification}`}>
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
