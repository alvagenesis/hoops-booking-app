// Venue configuration — update these values before deploying to a new facility.
// Used by PaymentModal for payment instructions and throughout the app for branding.

export const venueConfig = {
    name: 'YMCA Manila',
    logoPath: '/ymca-logo.png',
    contactPhone: '09XX-XXX-XXXX',

    // Payment account details shown to customers in the payment modal.
    // Fill in the real numbers before going live.
    payments: {
        gcash: {
            number: '09XX-XXX-XXXX',
            accountName: 'YMCA Manila',
        },
        maya: {
            number: '09XX-XXX-XXXX',
            accountName: 'YMCA Manila',
        },
        bank_transfer: {
            bank: 'BDO',
            accountNumber: 'XXXX-XXXX-XXXX',
            accountName: 'YMCA Manila',
        },
    },
};
