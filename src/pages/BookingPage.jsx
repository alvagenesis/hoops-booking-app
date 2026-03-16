import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
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
    const { user } = useAuth();
    const { courts } = useCourts();
    const { createReservation } = useReservations();
    const [step, setStep] = useState(0);
    const [selectedCourt, setSelectedCourt] = useState(null);
    const [selectedDates, setSelectedDates] = useState(undefined);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const { getSlotsForDay, getBookedSlotsForDay } = useTimeSlots(selectedCourt?.id);

    // Get available slots based on the first selected date's day of week
    const dayOfWeek = selectedDates?.from ? selectedDates.from.getDay() : null;
    const timeSlots = dayOfWeek !== null ? getSlotsForDay(dayOfWeek) : [];

    useEffect(() => {
        if (selectedDates?.from) {
            getBookedSlotsForDay(selectedDates.from).then(setBookedSlots);
        }
    }, [selectedDates, getBookedSlotsForDay]);

    const canAdvance = () => {
        if (step === 0) return !!selectedCourt;
        if (step === 1) return !!selectedDates?.from;
        if (step === 2) return !!selectedSlot;
        return true;
    };

    const handleConfirm = async ({ title, notes, totalAmount, dates, paymentStatus, paidAmount, paymentMethod }) => {
        setSubmitting(true);
        setError('');
        try {
            await createReservation({
                reservation: {
                    court_id: selectedCourt.id,
                    user_id: user.id,
                    title: title || 'Court Booking',
                    notes: notes || '',
                    start_time: selectedSlot.start,
                    end_time: selectedSlot.end,
                    status: 'confirmed',
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    payment_status: paymentStatus,
                    payment_method: paymentMethod,
                },
                dates,
            });
            navigate('/my-bookings');
        } catch (err) {
            setError(err.message || 'Failed to create booking.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
                {STEPS.map((label, i) => (
                    <div key={label} className="flex-1 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? 'bg-blue-600 text-white' :
                            i === step ? 'bg-blue-600/20 text-blue-400 border border-blue-500' :
                                'bg-[#1a1a24] text-gray-600 border border-gray-800'
                            }`}>
                            {i < step ? <Check className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-gray-200' : 'text-gray-600'}`}>{label}</span>
                        {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-blue-600' : 'bg-gray-800'}`} />}
                    </div>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 text-sm ml-4">Dismiss</button>
                </div>
            )}

            {/* Step Content */}
            <div className="bg-[#111116] border border-gray-800 rounded-xl p-6">
                {step === 0 && (
                    <CourtSelection courts={courts} selectedCourt={selectedCourt} onSelect={(c) => { setSelectedCourt(c); setSelectedSlot(null); }} />
                )}
                {step === 1 && (
                    <DateSelection selectedDates={selectedDates} onSelect={(d) => { setSelectedDates(d); setSelectedSlot(null); }} />
                )}
                {step === 2 && (
                    <TimeSlotSelection slots={timeSlots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} bookedSlots={bookedSlots} />
                )}
                {step === 3 && (
                    <BookingReview court={selectedCourt} dates={selectedDates} timeSlot={selectedSlot} onConfirm={handleConfirm} loading={submitting} />
                )}
            </div>

            {/* Navigation */}
            {step < 3 && (
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => step > 0 ? setStep(step - 1) : navigate('/dashboard')}
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
    );
};

export default BookingPage;
