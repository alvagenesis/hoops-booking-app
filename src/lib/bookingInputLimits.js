export const BOOKING_INPUT_LIMITS = {
    customerName: 80,
    customerEmail: 80,
    title: 100,
};

export function limitBookingInput(value, maxLength) {
    return (value || '').slice(0, maxLength);
}
