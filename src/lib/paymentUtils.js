export function derivePaymentStatus(totalAmount = 0, paidAmount = 0) {
    const total = Number(totalAmount || 0);
    const paid = Number(paidAmount || 0);

    if (total > 0 && paid >= total) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
}

export function normalizePaymentState(reservation) {
    const approvedPaidAmount = Number(reservation?.paid_amount || 0);
    const totalAmount = Number(reservation?.total_amount || 0);
    const pendingPaymentAmount = Number(reservation?.pending_payment_amount || 0);
    const intendedPaymentStatus = pendingPaymentAmount >= totalAmount && totalAmount > 0
        ? 'paid'
        : (pendingPaymentAmount > 0 ? 'partial' : 'unpaid');
    const legacyPaymentStatus = reservation?.payment_status || derivePaymentStatus(totalAmount, approvedPaidAmount) || intendedPaymentStatus;

    let paymentStatus = legacyPaymentStatus;
    if (legacyPaymentStatus === 'for_verification' || legacyPaymentStatus === 'rejected') {
        paymentStatus = derivePaymentStatus(totalAmount, approvedPaidAmount);
    }
    if (legacyPaymentStatus === 'full') {
        paymentStatus = 'paid';
    }

    const paymentReviewStatus = reservation?.payment_review_status || inferLegacyReviewStatus(legacyPaymentStatus, pendingPaymentAmount, approvedPaidAmount);

    return {
        ...reservation,
        paid_amount: approvedPaidAmount,
        pending_payment_amount: pendingPaymentAmount,
        payment_status: paymentStatus,
        payment_review_status: paymentReviewStatus,
    };
}

export function canSubmitPayment(reservation) {
    const normalized = normalizePaymentState(reservation);

    return Boolean(
        normalized
        && !['cancelled', 'completed', 'no_show'].includes(normalized.status)
        && normalized.payment_status !== 'paid'
        && normalized.payment_review_status !== 'pending'
        && (
            (normalized.status === 'pending_verification' && normalized.payment_review_status === 'rejected')
            || (normalized.status === 'confirmed' && normalized.payment_status === 'partial')
        )
    );
}

export function hasPendingPaymentReview(reservation) {
    const normalized = normalizePaymentState(reservation);
    return normalized?.payment_review_status === 'pending' && Number(normalized?.pending_payment_amount || 0) > 0;
}

export function getPaymentStatusMeta(status) {
    switch (status) {
        case 'partial':
            return { text: 'Deposit verified', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
        case 'paid':
            return { text: 'Fully paid', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
        default:
            return { text: 'Payment required', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    }
}

export function getPaymentReviewMeta(status) {
    switch (status) {
        case 'pending':
            return { text: 'In verification', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
        case 'approved':
            return { text: 'Verified', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
        case 'rejected':
            return { text: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
        default:
            return { text: 'No review needed', color: 'text-gray-400', bg: 'bg-slate-500/10 border-slate-500/20' };
    }
}

function inferLegacyReviewStatus(legacyPaymentStatus, pendingPaymentAmount, approvedPaidAmount) {
    if (legacyPaymentStatus === 'for_verification') return 'pending';
    if (legacyPaymentStatus === 'rejected') return 'rejected';
    if (pendingPaymentAmount > 0) return 'pending';
    if (approvedPaidAmount > 0) return 'approved';
    return 'not_submitted';
}
