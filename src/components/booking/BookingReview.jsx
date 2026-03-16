import { useState } from 'react';
import { Calendar, Clock, MapPin, FileText, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import PaymentModal from '../../modals/PaymentModal';

const BookingReview = ({ court, dates, timeSlot, onConfirm, loading }) => {
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [showPayment, setShowPayment] = useState(false);

    // Calculate totals
    const dateList = getDatesInRange(dates.from, dates.to || dates.from);
    const totalDays = dateList.length;
    const [startH] = timeSlot.start.split(':').map(Number);
    const [endH] = timeSlot.end.split(':').map(Number);
    const hoursPerDay = endH - startH;
    const totalAmount = court.hourly_rate * hoursPerDay * totalDays;

    const handleConfirm = () => {
        setShowPayment(true);
    };

    const handlePaymentConfirm = (paymentInfo) => {
        onConfirm({
            title,
            notes,
            totalAmount,
            dates: dateList,
            ...paymentInfo
        });
        setShowPayment(false);
    };

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-1">Review & Confirm</h3>
                <p className="text-sm text-gray-500">Check your booking details before confirming</p>
            </div>

            {/* Summary Card */}
            <div className="bg-[#16161c] border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: court.color }} />
                    <div>
                        <p className="font-semibold text-gray-100">{court.name}</p>
                        <p className="text-xs text-gray-500">{court.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                            <p className="text-gray-300">{dates.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {dates.to && dates.to.getTime() !== dates.from.getTime() && (
                                    <> – {dates.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                )}</p>
                            <p className="text-xs text-gray-500">{totalDays} day{totalDays > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                            <p className="text-gray-300">{timeSlot.label}</p>
                            <p className="text-xs text-gray-500">{hoursPerDay}h per day</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total</span>
                    <div className="text-right">
                        <p className="text-xl font-bold text-gray-100">₱{totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">₱{court.hourly_rate} × {hoursPerDay}h × {totalDays} day{totalDays > 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Optional fields */}
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-1.5 block">
                        <FileText className="w-3.5 h-3.5 inline mr-1" />
                        Booking Title <span className="text-gray-600">(optional)</span>
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Team Practice, Pickup Game..."
                        className="w-full bg-[#111116] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-1.5 block">Notes <span className="text-gray-600">(optional)</span></label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special requests or notes..."
                        rows={2}
                        className="w-full bg-[#111116] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                </div>
            </div>

            <Button onClick={handleConfirm} disabled={loading} className="w-full py-2.5 text-base gap-2">
                <CreditCard className="w-5 h-5" /> {loading ? 'Creating Booking...' : 'Proceed to Payment'}
            </Button>

            {showPayment && (
                <PaymentModal
                    bookingInfo={{ totalAmount }}
                    onClose={() => setShowPayment(false)}
                    onConfirm={handlePaymentConfirm}
                />
            )}
        </div>
    );
};

function getDatesInRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export default BookingReview;
