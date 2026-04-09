import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, CreditCard, User, Phone, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { venueConfig } from '../lib/venueConfig';

const STATUS_META = {
    awaiting_payment: { text: 'Awaiting Payment',  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    pending:          { text: 'Pending Review',     color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    confirmed:        { text: 'Confirmed',          color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
    completed:        { text: 'Completed',          color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
    cancelled:        { text: 'Cancelled',          color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
    no_show:          { text: 'No Show',            color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20' },
};

const PAYMENT_META = {
    unpaid:           { text: 'Not paid',           color: 'text-orange-400' },
    partial:          { text: 'Partial payment',    color: 'text-yellow-400' },
    for_verification: { text: 'Awaiting verification', color: 'text-yellow-400' },
    paid:             { text: 'Paid',               color: 'text-green-400' },
    rejected:         { text: 'Payment rejected',   color: 'text-red-400' },
};

function formatDateList(days) {
    if (!days?.length) return '—';
    const dates = days.map(d => new Date(d.date + 'T12:00:00'));
    if (dates.length === 1) return dates[0].toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(dates[0])} – ${new Date(days[days.length - 1].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

const MyBookingPage = () => {
    const navigate = useNavigate();
    const [refNumber, setRefNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [booking, setBooking] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setBooking(null);

        const ref = refNumber.trim().toUpperCase();
        const ph = phone.trim();

        if (!ref || !ph) {
            setError('Please enter both your booking reference and phone number.');
            return;
        }

        setLoading(true);

        try {
            // Find reservations whose ID starts with the ref prefix and phone matches
            const { data, error: fetchError } = await supabase
                .from('reservations')
                .select('*, courts(*), reservation_days(*)')
                .ilike('id', `${ref}%`)
                .eq('customer_phone', ph)
                .eq('is_guest_booking', true)
                .limit(1)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (!data) {
                setError('No booking found. Please check your reference number and phone number.');
            } else {
                setBooking(data);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statusMeta = booking ? (STATUS_META[booking.status] ?? STATUS_META.pending) : null;
    const paymentMeta = booking ? (PAYMENT_META[booking.payment_status] ?? PAYMENT_META.unpaid) : null;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-gray-200">
            {/* Header */}
            <div className="border-b border-gray-800 bg-[#111116]">
                <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={venueConfig.logoPath} alt={`${venueConfig.name} Logo`} className="h-10 w-auto object-contain" />
                        <div>
                            <p className="text-sm font-semibold text-gray-100">Check Booking Status</p>
                            <p className="text-xs text-gray-500">Look up your guest reservation</p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={() => navigate('/book')} className="text-gray-400 shrink-0">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Book
                    </Button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Search form */}
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-6 space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-100">Find Your Booking</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Enter the reference number from your confirmation page and the phone number you used when booking.</p>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Booking Reference</label>
                            <input
                                value={refNumber}
                                onChange={e => setRefNumber(e.target.value.toUpperCase())}
                                placeholder="e.g. A1B2C3D4"
                                maxLength={8}
                                className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 tracking-widest uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Phone Number</label>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="09XXXXXXXXX"
                                className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            {loading ? 'Searching...' : 'Find Booking'}
                        </Button>
                    </form>
                </div>

                {/* Result */}
                {booking && (
                    <div className="space-y-4">
                        {/* Status badge */}
                        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${statusMeta.bg}`}>
                            <span className={`text-sm font-semibold ${statusMeta.color}`}>{statusMeta.text}</span>
                            <span className="text-xs text-gray-500 font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
                        </div>

                        {/* Booking details */}
                        <div className="bg-[#111116] border border-gray-800 rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: booking.courts?.color ?? '#3b82f6' }} />
                                <div>
                                    <p className="font-semibold text-gray-100">{booking.courts?.name ?? 'Court'}</p>
                                    {booking.courts?.description && <p className="text-xs text-gray-500">{booking.courts.description}</p>}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                {booking.reservation_days?.length > 0 && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                                        <span>{formatDateList(booking.reservation_days)}</span>
                                    </div>
                                )}
                                {booking.start_time && booking.end_time && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                                        <span>{booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-400">
                                    <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                                    <span>Total: <span className="text-gray-200 font-semibold">₱{booking.total_amount?.toLocaleString()}</span></span>
                                    {booking.paid_amount > 0 && (
                                        <span className="text-gray-600 text-xs">· ₱{booking.paid_amount?.toLocaleString()} paid</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Payment:</span>
                                    <span className={`text-xs font-medium ${paymentMeta.color}`}>{paymentMeta.text}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-[#111116] border border-gray-800 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact on file</p>
                            {booking.customer_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span>{booking.customer_name}</span>
                                </div>
                            )}
                            {booking.customer_phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <span>{booking.customer_phone}</span>
                                </div>
                            )}
                        </div>

                        <Button onClick={() => navigate('/book')} className="w-full gap-2">
                            Book Another Slot
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBookingPage;
