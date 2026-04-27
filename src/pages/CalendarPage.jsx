import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PaymentModal from '../modals/PaymentModal';
import ReservationDetailModal from '../modals/ReservationDetailModal';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, isDateInRange, DAYS_OF_WEEK, formatCompactTimeRange } from '../lib/utils';
import { useReservations } from '../hooks/useReservations';
import { useAuth } from '../hooks/useAuth';

const SHORT_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MAX_VISIBLE_BOOKINGS = 3;

function DayOverflowPopup({ day, year, month, reservations, anchorRect, onClose, onSelect }) {
  const dayName = SHORT_DAYS[new Date(year, month, day).getDay()];

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('[data-day-popup]')) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const W = Math.min(260, window.innerWidth - 16);
  const estimatedH = 80 + reservations.length * 28;
  let left = anchorRect.left + (anchorRect.width - W) / 2;
  let top = anchorRect.top + 12;

  if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
  if (left < 8) left = 8;
  if (top + estimatedH > window.innerHeight - 8) top = Math.max(8, anchorRect.bottom - estimatedH - 12);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        data-day-popup="true"
        className="fixed z-[70] bg-[#1c1c24] border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden"
        style={{ left, top, width: W }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-3 pt-3 pb-2.5">
          <div className="leading-none">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em]">{dayName}</p>
            <p className="text-[28px] font-bold text-gray-100 leading-tight">{day}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ring-2 ring-gray-600 hover:ring-gray-400 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Booking rows */}
        <div className="px-2 pb-2 space-y-[2px] max-h-64 overflow-y-auto">
          {reservations.map((res, i) => {
            const timeLabel = formatCompactTimeRange(res.start_time, res.end_time);
            const isConfirmed = res.status === 'confirmed';
            return (
              <button
                key={i}
                className={`w-full text-left px-1.5 py-[1px] min-h-4 flex items-center rounded text-[11px] leading-4 truncate border transition-colors ${
                  isConfirmed
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20'
                    : 'bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20'
                }`}
                onClick={() => onSelect(res)}
              >
                <span className="font-medium truncate shrink min-w-0">{res.title || 'Booking'}</span>
                {timeLabel && <span className="opacity-70 ml-1.5 shrink-0">{timeLabel}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
}

function sortReservationsByTime(a, b) {
  const startDiff = toMinutes(a?.start_time) - toMinutes(b?.start_time);
  if (startDiff !== 0) return startDiff;

  return toMinutes(a?.end_time) - toMinutes(b?.end_time);
}

function toMinutes(time) {
  if (!time) return Number.MAX_SAFE_INTEGER;

  const [hour, minute = 0] = String(time).split(':').map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hour * 60 + minute;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { reservations, cancelReservation, updateReservation, payReservation } = useReservations();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Modal states
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [pendingPaymentRes, setPendingPaymentRes] = useState(null);

  const [bookingError, setBookingError] = useState('');
  const [dayPopup, setDayPopup] = useState(null);

  // Redirect any action params to /book
  useEffect(() => {
    const action = searchParams.get('action');
    if (action) {
      Promise.resolve().then(() => {
        navigate('/book');
        setSearchParams({}, { replace: true });
      });
    }
  }, [searchParams, setSearchParams]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToday = () => setCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const handleBalancePayment = async ({ paidAmount, paymentMethod, paymentNotes, paymentProofFile }) => {
    if (!pendingPaymentRes) return;
    try {
      await payReservation(pendingPaymentRes.id, paidAmount, paymentMethod, { paymentNotes, paymentProofFile });
      setPendingPaymentRes(null);
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const totalCells = Math.ceil(days.length / 7) * 7;
  while (days.length < totalCells) days.push(null);
  const calendarDays = days;
  const weekCount = calendarDays.length / 7;

  const getReservationsForDay = (day) => {
    if (!day) return [];
    const date = new Date(year, month, day);
    return reservations.filter(res => {
      if (res.reservation_days && res.reservation_days.length > 0) {
        return res.reservation_days.some(rd => {
          const rdDate = new Date(rd.date);
          return !isNaN(rdDate) && isSameDay(date, rdDate);
        });
      }
      const startRaw = res.start_date || res.start || res.created_at;
      const endRaw = res.end_date || res.end || res.created_at;
      if (!startRaw || !endRaw) return false;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (isNaN(start) || isNaN(end)) return false;
      return isDateInRange(date, start, end);
    }).sort(sortReservationsByTime);
  };

  return (
    <div className="flex h-full min-h-[640px] flex-col">
      {!user && !authLoading && (
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 p-3 bg-[#111116] border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Sign in to view existing bookings. To check real-time slot availability, use Book a Slot below.</p>
          <button
            onClick={() => navigate('/book')}
            className="shrink-0 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Book a Slot →
          </button>
        </div>
      )}
      {authLoading && (
        <div className="mb-4 shrink-0 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-300 text-sm">Loading your booking session...</p>
        </div>
      )}
      {bookingError && (
        <div className="mb-4 flex shrink-0 items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{bookingError}</p>
          <button onClick={() => setBookingError('')} className="text-red-400 hover:text-red-300 text-sm font-medium ml-4">Dismiss</button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col bg-[#111116] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Calendar Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-800 bg-[#16161c]">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-xl font-bold text-gray-100">{monthName} {year}</h2>
            <div className="flex items-center bg-[#1a1a24] rounded-lg p-1 border border-gray-800">
              <button onClick={prevMonth} className="p-1.5 hover:bg-[#2a2a35] rounded-md text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-[#2a2a35] rounded-md text-gray-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="flex items-center text-xs text-gray-400 gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Confirmed</span>
            <span className="flex items-center text-xs text-gray-400 gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Pending</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#0a0a0c]">
          <div className="flex min-h-full min-w-[320px] flex-col">
            <div className="grid grid-cols-7 border-b border-gray-800 bg-[#111116] sticky top-0 z-10">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wider uppercase border-r border-gray-800 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}>
              {calendarDays.map((day, idx) => {
                const dayReservations = getReservationsForDay(day);
                const isToday = day && isSameDay(new Date(year, month, day), new Date());
                const hasOverflow = dayReservations.length > MAX_VISIBLE_BOOKINGS;
                const visibleCount = hasOverflow ? MAX_VISIBLE_BOOKINGS : dayReservations.length;

                const cellClass = `p-1 sm:p-2 flex flex-col border-b border-r border-gray-800/50 last:border-r-0 ${
                  !day ? 'bg-[#0d0d10]' : 'bg-[#111116]'
                }`;

                return (
                  <div key={idx} className={cellClass} data-calendar-day-cell={day ? 'true' : undefined}>
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-blue-600 text-white' : 'text-gray-400'
                          }`}>
                            {day}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          {dayReservations.slice(0, visibleCount).map((res, rIdx) => {
                            let resStart, resEnd;
                            if (res.reservation_days && res.reservation_days.length > 0) {
                              const sortedDays = [...res.reservation_days].sort((a, b) => a.date.localeCompare(b.date));
                              resStart = new Date(sortedDays[0].date);
                              resEnd = new Date(sortedDays[sortedDays.length - 1].date);
                            } else {
                              resStart = new Date(res.start_date || res.start || Date.now());
                              resEnd = new Date(res.end_date || res.end || Date.now());
                            }
                            const isMultiDay = !isNaN(resStart) && !isNaN(resEnd) && resStart.getTime() !== resEnd.getTime();
                            const isStart = !isNaN(resStart) && isSameDay(new Date(year, month, day), resStart);

                            return (
                              <div
                                key={rIdx}
                                className={`px-1.5 py-[1px] text-[11px] leading-4 rounded truncate cursor-pointer transition-colors ${res.status === 'confirmed'
                                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20'
                                  : 'bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20'
                                  } ${isMultiDay && !isStart ? 'opacity-70 ml-2' : ''}`}
                                title={res.title}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReservation(res);
                                }}
                              >
                                {isMultiDay && !isStart ? 'Cont.' : res.title}
                              </div>
                            );
                          })}
                        </div>
                        {hasOverflow && (
                          <button
                            className="w-full text-left px-1.5 py-0.5 mt-0.5 text-[11px] text-gray-400 hover:text-blue-400 transition-colors rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cell = e.currentTarget.closest('[data-calendar-day-cell]');
                              setDayPopup({
                                day,
                                reservations: dayReservations,
                                anchorRect: (cell || e.currentTarget).getBoundingClientRect(),
                              });
                            }}
                          >
                            + {dayReservations.length - visibleCount} more
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {dayPopup && (
        <DayOverflowPopup
          day={dayPopup.day}
          year={year}
          month={month}
          reservations={dayPopup.reservations}
          anchorRect={dayPopup.anchorRect}
          onClose={() => setDayPopup(null)}
          onSelect={(res) => { setSelectedReservation(res); setDayPopup(null); }}
        />
      )}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onCancel={async (id) => {
            try {
              await cancelReservation(id);
              setSelectedReservation(null);
            } catch (err) {
              setBookingError('Cancellation failed: ' + err.message);
            }
          }}
          onAdminUpdate={role === 'admin' ? async (id, updates) => {
            try {
              await updateReservation(id, updates);
              setSelectedReservation(null);
            } catch (err) {
              setBookingError('Update failed: ' + err.message);
            }
          } : undefined}
          onPay={(res) => { setPendingPaymentRes(res); setSelectedReservation(null); }}
        />
      )}
      {pendingPaymentRes && (
        <PaymentModal
          bookingInfo={{
            totalAmount: pendingPaymentRes.total_amount - (pendingPaymentRes.paid_amount || 0),
            originalTotal: pendingPaymentRes.total_amount,
          }}
          onClose={() => setPendingPaymentRes(null)}
          onConfirm={handleBalancePayment}
          partialPaymentUsed={pendingPaymentRes.payment_status === 'partial'}
        />
      )}
    </div>
  );
};

export default CalendarPage;
