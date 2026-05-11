// Venue configuration for one deployed client instance.
// Each client should provide these values through Vite environment variables.

const venueName = import.meta.env.VITE_VENUE_NAME || 'YMCA Manila';

export const venueConfig = {
    clientKey: import.meta.env.VITE_CLIENT_KEY || 'ymca',
    name: venueName,
    logoPath: import.meta.env.VITE_VENUE_LOGO || '/ymca-logo.png',
    loginBackgroundImage: import.meta.env.VITE_LOGIN_BACKGROUND_IMAGE || '/ymca-bg.png',
    contactPhone: import.meta.env.VITE_CONTACT_PHONE || '09XX-XXX-XXXX',

    // Payment account details shown to customers in the payment modal.
    // Fill in the real numbers per deployed client before going live.
    payments: {
        gcash: {
            number: import.meta.env.VITE_GCASH_NUMBER || '09XX-XXX-XXXX',
            accountName: import.meta.env.VITE_GCASH_ACCOUNT_NAME || venueName,
        },
        maya: {
            number: import.meta.env.VITE_MAYA_NUMBER || '09XX-XXX-XXXX',
            accountName: import.meta.env.VITE_MAYA_ACCOUNT_NAME || venueName,
        },
        bank_transfer: {
            bank: import.meta.env.VITE_BANK_NAME || 'BDO',
            accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || 'XXXX-XXXX-XXXX',
            accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || venueName,
        },
    },
};
