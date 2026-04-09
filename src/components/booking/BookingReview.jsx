import { useState } from 'react';
import { Calendar, Clock, FileText, CreditCard, User, Mail, Phone } from 'lucide-react';
import { formatLocalDate } from '../../lib/utils';
import Button from '../ui/Button';
import PaymentModal from '../../modals/PaymentModal';

const BookingReview = ({ court, dates, timeSlots, onConfirm, loading, isGuest }) => {
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [touched, setTouched] = useState(false);
    const customerEmailLooksValid = !customerEmail || /.+@.+\..+/.test(customerEmail);

    // Calculate totals
    const dateList = getDatesInRange(dates.from, dates.to || dates.from);
    const totalDays = dateList.length;
    const firstSlot = timeSlots[0];
    const lastSlot = timeSlots[timeSlots.length - 1];
    const [startH, startM = 0] = firstSlot.start.split(':').map(Number);
    const [endH, endM = 0] = lastSlot.end.split(':').map(Number);
    const hoursPerDay = (endH * 60 + endM - startH * 60 - startM) / 60;
    const totalAmount = court.hourly_rate * hoursPerDay * totalDays;

    const handleConfirm = () => {
        setTouched(true);
        if (!customerName.trim() || !customerPhone.trim() || !customerEmailLooksValid) return;
        setShowPayment(true);
    };

    const handlePaymentConfirm = (paymentInfo) => {
        onConfirm({
            title,
            notes,
            totalAmount,
            dates: dateList,
            customerName,
            customerPhone,
            customerEmail,
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

            {isGuest && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-sm text-gray-300">
                    <p className="font-medium text-blue-300">Public / guest-friendly booking path</p>
                    <p className="mt-1 text-xs text-gray-400">
                        Use your real contact details here. Staff may use them to verify payment, confirm the booking, or follow up if there are schedule changes.
                    </p>
                </div>
            )}

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
                            <p className="text-gray-300">{firstSlot.label.split('–')[0].trim()} – {lastSlot.label.split('–')[1]?.trim() ?? lastSlot.end}</p>
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

            {/* Customer details */}
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-1.5 block">
                        <User className="w-3.5 h-3.5 inline mr-1" />
                        Customer Name
                    </label>
                    <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Full name"
                        className={`w-full bg-[#111116] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${touched && !customerName.trim() ? 'border-red-500/50' : 'border-gray-800'}`}
                    />
                    {touched && !customerName.trim() && (
                        <p className="text-xs text-red-400 mt-1">Name is required.</p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-400 mb-1.5 block">
                            <Phone className="w-3.5 h-3.5 inline mr-1" />
                            Phone Number
                        </label>
                        <input
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="09XXXXXXXXX"
                            className={`w-full bg-[#111116] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${touched && !customerPhone.trim() ? 'border-red-500/50' : 'border-gray-800'}`}
                        />
                        {touched && !customerPhone.trim() && (
                            <p className="text-xs text-red-400 mt-1">Phone is required.</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400 mb-1.5 block">
                            <Mail className="w-3.5 h-3.5 inline mr-1" />
                            Email Address
                        </label>
                        <input
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="name@example.com"
                            className={`w-full bg-[#111116] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${customerEmailLooksValid ? 'border-gray-800' : 'border-red-500/50'}`}
                        />
                        {!customerEmailLooksValid && (
                            <p className="text-xs text-red-400 mt-1">Please enter a valid email address or leave it blank.</p>
                        )}
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
        dates.push(formatLocalDate(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export default BookingReview;
