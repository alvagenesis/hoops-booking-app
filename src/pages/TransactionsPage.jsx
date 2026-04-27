import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, Download, Search, TrendingUp, Clock, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { venueConfig } from '../lib/venueConfig';
import { useReservations } from '../hooks/useReservations';
import { formatDate, formatLocalDate } from '../lib/utils';
import Button from '../components/ui/Button';
import { derivePaymentStatus, getPaymentReviewMeta, normalizePaymentState } from '../lib/paymentUtils';

const DESKTOP_PAGE_SIZE = 10;
const MOBILE_BATCH_SIZE = 8;

function getAddonSummary(tx) {
    const addons = Array.isArray(tx.reservation_addons) ? tx.reservation_addons : [];
    const addonCount = addons.length;
    const addonTotal = addons.reduce((sum, addon) => sum + Number(addon.price_at_booking || 0), 0);
    const addonNames = addons
        .map(addon => addon.amenities?.name || addon.name || addon.amenity_id)
        .filter(Boolean)
        .join(' | ');

    return { addonCount, addonTotal, addonNames };
}

function exportToCsv(rows, filename) {
    const headers = ['Date', 'Title', 'Court', 'Method', 'Total Amount', 'Paid Amount', 'Balance', 'Add-on Count', 'Add-on Total', 'Add-ons', 'Status'];
    const csvRows = [
        headers.join(','),
        ...rows.map(tx => {
            const { addonCount, addonTotal, addonNames } = getAddonSummary(tx);
            return [
                new Date(tx.created_at).toLocaleDateString(),
                `"${(tx.title || 'Reservation').replace(/"/g, '""')}"`,
                `"${(tx.courts?.name || 'N/A').replace(/"/g, '""')}"`,
                tx.payment_method || 'N/A',
                tx.total_amount || 0,
                tx.paid_amount || 0,
                (tx.total_amount || 0) - (tx.paid_amount || 0),
                addonCount,
                addonTotal,
                `"${addonNames.replace(/"/g, '""')}"`,
                tx.payment_status || 'unpaid',
            ].join(',');
        })
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const TransactionsPage = () => {
    const { reservations, loading, updateReservation } = useReservations();
    const [updatingId, setUpdatingId] = useState(null);
    const [desktopPage, setDesktopPage] = useState(1);
    const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_BATCH_SIZE);
    const isMobile = useIsMobile();
    const loadMoreRef = useRef(null);
    const transactionCutoffDate = useMemo(() => getTransactionCutoffDate(), []);

    // Filter to only reservations that have payments
    const transactions = useMemo(() => {
        return reservations
            .map(normalizePaymentState)
            .filter(r => (r.paid_amount > 0 || r.pending_payment_amount > 0 || ['paid', 'partial'].includes(r.payment_status)))
            .filter(r => isWithinTransactionWindow(r, transactionCutoffDate))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [reservations, transactionCutoffDate]);

    const totalPages = Math.max(1, Math.ceil(transactions.length / DESKTOP_PAGE_SIZE));
    const currentDesktopPage = Math.min(desktopPage, totalPages);
    const visibleTransactions = isMobile
        ? transactions.slice(0, mobileVisibleCount)
        : transactions.slice((currentDesktopPage - 1) * DESKTOP_PAGE_SIZE, currentDesktopPage * DESKTOP_PAGE_SIZE);
    const hasMoreMobileRows = isMobile && mobileVisibleCount < transactions.length;

    useEffect(() => {
        setDesktopPage(1);
        setMobileVisibleCount(MOBILE_BATCH_SIZE);
    }, [transactions.length]);

    useEffect(() => {
        if (!isMobile || !hasMoreMobileRows || !loadMoreRef.current || typeof IntersectionObserver === 'undefined') {
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setMobileVisibleCount(count => Math.min(count + MOBILE_BATCH_SIZE, transactions.length));
            }
        }, { rootMargin: '160px' });

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasMoreMobileRows, isMobile, transactions.length]);

    const stats = useMemo(() => {
        const total = transactions.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
        const pending = transactions.reduce((sum, r) => sum + ((r.total_amount || 0) - (r.paid_amount || 0)), 0);
        const reviewCount = transactions.filter(r => r.payment_review_status === 'pending').length;
        return { total, pending, reviewCount };
    }, [transactions]);

    const handlePaymentReview = useCallback(async (reservation, action) => {
        setUpdatingId(reservation.id);
        try {
            if (action === 'approve') {
                const approvedPaidAmount = (reservation.paid_amount || 0) + (reservation.pending_payment_amount || 0);
                await updateReservation(reservation.id, {
                    payment_status: derivePaymentStatus(reservation.total_amount, approvedPaidAmount),
                    payment_review_status: 'approved',
                    payment_reviewed_at: new Date().toISOString(),
                    paid_amount: approvedPaidAmount,
                    payment_method: reservation.pending_payment_method || reservation.payment_method,
                    payment_notes: reservation.pending_payment_notes || reservation.payment_notes,
                    payment_proof_url: reservation.pending_payment_proof_url || reservation.payment_proof_url,
                    pending_payment_amount: 0,
                    pending_payment_method: null,
                    pending_payment_notes: '',
                    pending_payment_proof_url: null,
                    status: 'confirmed',
                    confirmed_at: new Date().toISOString(),
                });
            } else if (action === 'reject') {
                await updateReservation(reservation.id, {
                    payment_review_status: 'rejected',
                    payment_reviewed_at: new Date().toISOString(),
                    pending_payment_amount: 0,
                    pending_payment_method: null,
                    pending_payment_notes: '',
                    pending_payment_proof_url: null,
                    status: (reservation.paid_amount || 0) > 0 ? 'confirmed' : 'pending_verification',
                });
            }
        } finally {
            setUpdatingId(null);
        }
    }, [updateReservation]);

    const handleExport = useCallback(() => {
        const today = formatLocalDate(new Date());
        exportToCsv(transactions, `${venueConfig.name.toLowerCase().replace(/\s+/g, '-')}-transactions-${today}.csv`);
    }, [transactions]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-7 w-64 bg-gray-800/60 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-gray-800/60 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-32 bg-gray-800/60 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-800/60 animate-pulse" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-24 bg-gray-800/60 rounded animate-pulse" />
                                    <div className="h-6 w-16 bg-gray-800/60 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-xl overflow-hidden p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-4">
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} className="h-4 flex-1 bg-gray-800/60 rounded animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-400" /> Revenue & Transactions
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Track payments and manage facility financial records from the last 3 months.</p>
                </div>
                <Button variant="secondary" className="gap-2" onClick={handleExport} disabled={transactions.length === 0}>
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Total Revenue</p>
                            <h3 className="text-xl font-bold text-gray-100">₱{stats.total.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Pending Collection</p>
                            <h3 className="text-xl font-bold text-gray-100">₱{stats.pending.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Needs Review</p>
                            <h3 className="text-xl font-bold text-gray-100">{stats.reviewCount} items</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-[#111116] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-medium text-gray-200">Recent Payment Records</h3>
                    <div className="text-xs text-gray-500">Real-time sync from Supabase</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#16161c] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Transaction Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Paid</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {visibleTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-[#1a1a24] transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {formatDate(new Date(tx.created_at))}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-200">{tx.customer_name || tx.title || 'Reservation'}</div>
                                        <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                                            <span>{tx.courts?.name || 'Unknown court'}</span>
                                            <span>•</span>
                                            <span className="capitalize">{tx.booking_source || (tx.user_id ? 'member' : 'guest')} booking</span>
                                            <span>•</span>
                                            <span>ID: {tx.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 uppercase">
                                        {tx.payment_method || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-200">
                                        <div>₱{tx.total_amount?.toLocaleString()}</div>
                                        {(() => {
                                            const { addonCount, addonTotal } = getAddonSummary(tx);
                                            if (!addonCount) return null;
                                            return (
                                                <div className="text-[11px] text-blue-400 mt-1">
                                                    Includes ₱{addonTotal.toLocaleString()} add-ons ({addonCount})
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-green-400 font-medium">
                                        ₱{tx.paid_amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${paymentBadgeStyles(tx.payment_status)}`}>
                                                {tx.payment_status || 'unpaid'}
                                            </span>
                                            <div className={`text-[10px] font-bold uppercase tracking-wider ${getPaymentReviewMeta(tx.payment_review_status).color}`}>
                                                {getPaymentReviewMeta(tx.payment_review_status).text}
                                            </div>
                                            {(tx.pending_payment_proof_url || tx.payment_proof_url) && (
                                                <div>
                                                    <a href={tx.pending_payment_proof_url || tx.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                                                        View proof
                                                    </a>
                                                </div>
                                            )}
                                            {tx.pending_payment_amount > 0 && <div className="text-[11px] text-yellow-400">Pending review: ₱{tx.pending_payment_amount.toLocaleString()}</div>}
                                            {(() => {
                                                const { addonNames, addonCount } = getAddonSummary(tx);
                                                if (!addonCount) return null;
                                                return <div className="text-[11px] text-blue-400">Add-ons: {addonNames}</div>;
                                            })()}
                                            {tx.customer_phone && <div className="text-[11px] text-gray-500">{tx.customer_phone}</div>}
                                            {tx.customer_email && <div className="text-[11px] text-gray-500">{tx.customer_email}</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {tx.payment_review_status === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePaymentReview(tx, 'approve')}
                                                    disabled={updatingId === tx.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handlePaymentReview(tx, 'reject')}
                                                    disabled={updatingId === tx.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-sm">
                                        No recent transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {transactions.length > 0 && (
                    <div className="border-t border-gray-800 px-4 py-4">
                        <DesktopPagination
                            page={currentDesktopPage}
                            totalPages={totalPages}
                            totalItems={transactions.length}
                            pageSize={DESKTOP_PAGE_SIZE}
                            onPageChange={setDesktopPage}
                        />
                        <MobileLoadMore
                            loadMoreRef={loadMoreRef}
                            visibleCount={visibleTransactions.length}
                            totalItems={transactions.length}
                            hasMore={hasMoreMobileRows}
                            onLoadMore={() => setMobileVisibleCount(count => Math.min(count + MOBILE_BATCH_SIZE, transactions.length))}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

function getTransactionCutoffDate() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setHours(0, 0, 0, 0);
    return cutoff;
}

function isWithinTransactionWindow(transaction, cutoffDate) {
    const transactionDate = transaction?.created_at ? new Date(transaction.created_at) : null;

    if (!transactionDate || Number.isNaN(transactionDate.getTime())) {
        return true;
    }

    return transactionDate >= cutoffDate;
}

function DesktopPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
    const pages = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
    const startItem = totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    if (totalPages <= 1) {
        return (
            <div className="hidden md:flex items-center justify-between">
                <p className="text-xs text-gray-500">Showing {totalItems} transaction{totalItems !== 1 ? 's' : ''}</p>
            </div>
        );
    }

    return (
        <div className="hidden md:flex items-center justify-between">
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
        <div className="md:hidden text-center">
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
                <p className="pt-3 text-xs text-gray-600">All transactions loaded</p>
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

function paymentBadgeStyles(status) {
    switch (status) {
        case 'paid':
            return 'bg-green-500/10 text-green-400';
        case 'partial':
            return 'bg-orange-500/10 text-orange-400';
        case 'for_verification':
            return 'bg-yellow-500/10 text-yellow-400';
        case 'rejected':
            return 'bg-red-500/10 text-red-400';
        default:
            return 'bg-slate-500/10 text-slate-400';
    }
}

export default TransactionsPage;
