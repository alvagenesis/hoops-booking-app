import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import CourtSelection from '../components/booking/CourtSelection';
import DateSelection from '../components/booking/DateSelection';
import TimeSlotSelection from '../components/booking/TimeSlotSelection';
import BookingReview from '../components/booking/BookingReview';
import { useCourts } from '../hooks/useCourts';
import { useTimeSlots } from '../hooks/useTimeSlots';
import { useReservations } from '../hooks/useReservations';
import { useAuth } from '../hooks/useAuth';

const STEPS = ['Court', 'Date', 'Time', 'Review'];

const BookingPage = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { courts } = useCourts();
    const { createReservation } = useReservations();
    const [step, setStep] = useState(0);
    const [selectedCourt, setSelectedCourt] = useState(null);
    const [selectedDates, setSelectedDates] = useState(undefined);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const { getSlotsForDay, getBookedSlotsForDay } = useTimeSlots(selectedCourt?.id);

    // Get available slots based on the first selected date's day of week
    const dayOfWeek = selectedDates?.from ? selectedDates.from.getDay() : null;
    const timeSlots = dayOfWeek !== null ? getSlotsForDay(dayOfWeek) : [];

    useEffect(() => {
        if (selectedDates?.from && selectedCourt?.id) {
            getBookedSlotsForDay(selectedDates.from).then(setBookedSlots);
        } else {
            setBookedSlots([]);
        }
    }, [selectedDates, selectedCourt, getBookedSlotsForDay]);

    const canAdvance = () => {
        if (step === 0) return !!selectedCourt;
        if (step === 1) return !!selectedDates?.from;
        if (step === 2) return selectedSlots.length > 0;
        return true;
    };

    const handleConfirm = async ({ title, notes, totalAmount, dates, paymentStatus, paidAmount, paymentMethod, customerName, customerPhone, customerEmail, paymentNotes, paymentProofFile }) => {
        setSubmitting(true);
        setError('');
        const isGuestBooking = !user;
        const baseReservation = {
            court_id: selectedCourt.id,
            title: title || 'Court Booking',
            notes: notes || '',
            start_time: selectedSlots[0].start,
            end_time: selectedSlots[selectedSlots.length - 1].end,
            status: paymentStatus === 'paid' ? 'pending' : 'awaiting_payment',
            total_amount: totalAmount,
            paid_amount: paidAmount,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            customer_name: customerName?.trim() || '',
            customer_phone: customerPhone?.trim() || '',
            customer_email: customerEmail?.trim() || '',
            payment_notes: paymentNotes || '',
        };

        const reservationPayload = isGuestBooking
            ? {
                ...baseReservation,
                user_id: null,
                booking_source: 'guest',
                is_guest_booking: true,
            }
            : {
                ...baseReservation,
                user_id: user.id,
                booking_source: 'member',
                is_guest_booking: false,
            };

        try {
            const result = await createReservation({
                reservation: reservationPayload,
                dates,
                paymentProofFile,
            });
            if (isGuestBooking) {
                navigate('/booking-success', { state: { booking: result, court: selectedCourt, dates, slots: selectedSlots } });
            } else {
                navigate('/my-bookings');
            }
        } catch (err) {
            setError(err.message || 'Failed to create booking.');
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-6 text-sm text-gray-400">
                    Loading booking access...
                </div>
            </div>
        );
    }

    return (
        <div className={user ? 'max-w-3xl mx-auto space-y-6' : 'min-h-screen bg-[#0a0a0c] text-gray-200'}>
            {!user && (
                <div className="border-b border-gray-800 bg-[#111116]">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <img src="/ymca-logo.png" alt="YMCA Logo" className="h-10 w-auto object-contain" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-100 truncate">Public Court Booking</p>
                                <p className="text-xs text-gray-500 truncate">Reserve a slot without signing in</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => navigate('/calendar')}>Back to Calendar</Button>
                            <Button onClick={() => navigate('/login')}>Sign In</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className={user ? 'space-y-6' : 'max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6'}>
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
                    <p className="text-sm font-medium text-gray-200">{user ? 'Member Booking Flow' : 'Guest Booking Flow'}</p>
                    <p className="text-xs text-gray-500">
                        {user
                            ? 'Your booking will be linked to your account and appear in My Bookings.'
                            : 'You can reserve without signing in. Make sure your contact details are correct so the venue can reach you.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {STEPS.map((label, i) => (
                        <div key={label} className="flex-1 flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600/20 text-blue-400 border border-blue-500' : 'bg-[#1a1a24] text-gray-600 border border-gray-800'}`}>
                                {i < step ? <Check className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-gray-200' : 'text-gray-600'}`}>{label}</span>
                            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-blue-600' : 'bg-gray-800'}`} />}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between gap-3">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 text-sm">Dismiss</button>
                    </div>
                )}

                <div className="bg-[#111116] border border-gray-800 rounded-xl p-6">
                    {step === 0 && (
                        <CourtSelection courts={courts} selectedCourt={selectedCourt} onSelect={(c) => { setSelectedCourt(c); setSelectedSlots([]); }} />
                    )}
                    {step === 1 && (
                        <DateSelection selectedDates={selectedDates} onSelect={(d) => { setSelectedDates(d); setSelectedSlots([]); }} />
                    )}
                    {step === 2 && (
                        <TimeSlotSelection slots={timeSlots} selectedSlots={selectedSlots} onSelect={setSelectedSlots} bookedSlots={bookedSlots} hourlyRate={selectedCourt?.hourly_rate} selectedDate={selectedDates?.from} />
                    )}
                    {step === 3 && (
                        <BookingReview court={selectedCourt} dates={selectedDates} timeSlots={selectedSlots} onConfirm={handleConfirm} loading={submitting} isGuest={!user} />
                    )}
                </div>

                {step < 3 && (
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => step > 0 ? setStep(step - 1) : navigate(user ? '/dashboard' : '/calendar')}
                            className="text-gray-400 hover:text-gray-200"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            {step > 0 ? 'Back' : 'Cancel'}
                        </Button>
                        <Button
                            onClick={() => setStep(step + 1)}
                            disabled={!canAdvance()}
                            className="gap-1"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingPage;
