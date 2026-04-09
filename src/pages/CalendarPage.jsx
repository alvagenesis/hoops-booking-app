import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import BookingModal from '../modals/BookingModal';
import PaymentModal from '../modals/PaymentModal';
import AIBookingModal from '../modals/AIBookingModal';
import ReservationDetailModal from '../modals/ReservationDetailModal';
import { getDaysInMonth, getFirstDayOfMonth, formatDate, formatLocalDate, isSameDay, isDateInRange, DAYS_OF_WEEK } from '../lib/utils';
import { useReservations } from '../hooks/useReservations';
import { useCourts } from '../hooks/useCourts';
import { useAuth } from '../hooks/useAuth';

const SHORT_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MAX_VISIBLE = 3;

function DayOverflowPopup({ day, year, month, reservations, anchorRect, onClose, onSelect }) {
  const dayName = SHORT_DAYS[new Date(year, month, day).getDay()];

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('[data-day-popup]')) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const W = 220;
  let left = anchorRect.left;
  let top  = anchorRect.bottom + 6;
  if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
  if (left < 8) left = 8;
  const estimatedH = 80 + reservations.length * 28;
  if (top + estimatedH > window.innerHeight - 8) top = anchorRect.top - estimatedH - 6;

  return (
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
            const timeLabel = res.start_time && res.end_time ? `${res.start_time}–${res.end_time}` : '';
            const isConfirmed = res.status === 'confirmed';
            return (
              <button
                key={i}
                className={`w-full text-left px-2 h-[22px] flex items-center rounded text-[12px] leading-none truncate transition-opacity hover:opacity-75 ${
                  isConfirmed
                    ? 'bg-[#4a6fa5] text-white'
                    : 'bg-[#a56a4a] text-white'
                }`}
                onClick={() => onSelect(res)}
              >
                <span className="font-medium truncate shrink min-w-0">{res.title || 'Booking'}</span>
                {timeLabel && <span className="opacity-70 ml-1.5 shrink-0 text-[11px]">{timeLabel}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { reservations, createReservation, cancelReservation, updateReservation } = useReservations();
  const { courts } = useCourts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAiBookingModalOpen, setIsAiBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [aiPrefillData, setAiPrefillData] = useState(null);
  const [pendingBookingInfo, setPendingBookingInfo] = useState(null);

  const [bookingError, setBookingError] = useState('');
  const [dayPopup, setDayPopup] = useState(null);

  // Handle header button actions via URL params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action) {
      // Move state updates to a microtask to avoid 'set-state-in-effect' warning
      Promise.resolve().then(() => {
        if (!user) {
          navigate('/book');
          setSearchParams({}, { replace: true });
          return;
        }
        if (action === 'smart-book') {
          setIsAiBookingModalOpen(true);
        } else if (action === 'new-booking') {
          setAiPrefillData(null);
          setIsBookingModalOpen(true);
        }
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

  const handleDayClick = (day) => {
    if (!user) {
      navigate('/book');
      return;
    }
    const clickedDate = new Date(year, month, day);
    if (!selectedDates.start || (selectedDates.start && selectedDates.end)) {
      setSelectedDates({ start: clickedDate, end: null });
    } else {
      if (clickedDate >= selectedDates.start) {
        setSelectedDates({ start: selectedDates.start, end: clickedDate });
        setAiPrefillData(null);
        setTimeout(() => setIsBookingModalOpen(true), 300);
      } else {
        setSelectedDates({ start: clickedDate, end: null });
      }
    }
  };

  const handleInitiateBooking = (bookingData) => {
    setPendingBookingInfo(bookingData);
    setIsBookingModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (paymentData) => {
    setBookingError('');
    if (!user?.id) {
      setBookingError('Your session is still loading. Please wait a moment and try again.');
      return;
    }
    try {
      const dates = getDatesInRange(pendingBookingInfo.start, pendingBookingInfo.end);
      await createReservation({
        reservation: {
          court_id: pendingBookingInfo.courtId,
          user_id: user.id,
          title: pendingBookingInfo.title,
          notes: pendingBookingInfo.notes || '',
          start_time: pendingBookingInfo.startTime || '08:00',
          end_time: pendingBookingInfo.endTime || '09:00',
          status: paymentData.paymentStatus === 'paid' ? 'pending' : 'awaiting_payment',
          payment_status: paymentData.paymentStatus,
          paid_amount: paymentData.paidAmount,
          total_amount: pendingBookingInfo.totalAmount,
          payment_method: paymentData.paymentMethod,
          payment_notes: paymentData.paymentNotes || '',
          booking_source: 'member',
          is_guest_booking: false,
        },
        dates,
        paymentProofFile: paymentData.paymentProofFile,
      });
    } catch (err) {
      setBookingError(err?.message || 'Failed to save booking. Please try again.');
    }
    setIsPaymentModalOpen(false);
    setPendingBookingInfo(null);
    setSelectedDates({ start: null, end: null });
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const totalCells = Math.ceil(days.length / 7) * 7;
  while (days.length < totalCells) days.push(null);
  const calendarDays = days;

  const isDateSelected = (day) => {
    if (!day || !selectedDates.start) return false;
    const date = new Date(year, month, day);
    if (selectedDates.end) return date >= selectedDates.start && date <= selectedDates.end;
    return isSameDay(date, selectedDates.start);
  };

  const isSelectionStart = (day) => day && selectedDates.start && isSameDay(new Date(year, month, day), selectedDates.start);
  const isSelectionEnd = (day) => day && selectedDates.end && isSameDay(new Date(year, month, day), selectedDates.end);

  const getReservationsForDay = (day) => {
    if (!day) return [];
    const date = new Date(year, month, day);
    return reservations.filter(res => {
      // Support reservation_days array (fallback data shape)
      if (res.reservation_days && res.reservation_days.length > 0) {
        return res.reservation_days.some(rd => {
          const rdDate = new Date(rd.date);
          return !isNaN(rdDate) && isSameDay(date, rdDate);
        });
      }
      // Support start_date / end_date range, then single created reservation fallback
      const startRaw = res.start_date || res.start || res.created_at;
      const endRaw = res.end_date || res.end || res.created_at;
      if (!startRaw || !endRaw) return false;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (isNaN(start) || isNaN(end)) return false;
      return isDateInRange(date, start, end);
    });
  };

  return (
    <>
      {!user && !authLoading && (
        <div className="mb-4 flex items-center justify-between gap-3 p-3 bg-[#111116] border border-gray-800 rounded-lg">
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
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-300 text-sm">Loading your booking session...</p>
        </div>
      )}
      {bookingError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
          <p className="text-red-400 text-sm">{bookingError}</p>
          <button onClick={() => setBookingError('')} className="text-red-400 hover:text-red-300 text-sm font-medium ml-4">Dismiss</button>
        </div>
      )}
      <div className="min-h-[600px] flex flex-col bg-[#111116] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
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
        <div className="flex-1 overflow-auto bg-[#0a0a0c]">
          <div className="min-w-[320px] flex flex-col">
            <div className="grid grid-cols-7 border-b border-gray-800 bg-[#111116] sticky top-0 z-10">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wider uppercase border-r border-gray-800 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(110px, auto)' }}>
              {calendarDays.map((day, idx) => {
                const dayReservations = getReservationsForDay(day);
                const isToday = day && isSameDay(new Date(year, month, day), new Date());
                const selected = isDateSelected(day);
                const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
                const isPast = day && new Date(year, month, day) < todayDate;
                const hasOverflow = dayReservations.length > MAX_VISIBLE;
                const visibleCount = hasOverflow ? MAX_VISIBLE - 1 : dayReservations.length;

                let cellClass = "p-1 sm:p-2 flex flex-col border-b border-r border-gray-800/50 last:border-r-0 transition-colors group ";
                if (!day) cellClass += "bg-[#0d0d10]";
                else if (isPast) cellClass += "bg-[#0d0d10] opacity-40 cursor-not-allowed";
                else if (selected) {
                  cellClass += "bg-blue-900/20 cursor-pointer";
                  if (isSelectionStart(day)) cellClass += " rounded-l-lg border-l-2 border-l-blue-500";
                  if (isSelectionEnd(day)) cellClass += " rounded-r-lg border-r-2 border-r-blue-500";
                }
                else cellClass += "hover:bg-[#16161c] bg-[#111116] cursor-pointer";

                return (
                  <div key={idx} className={cellClass} onClick={() => day && !isPast && handleDayClick(day)}>
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-400 group-hover:text-gray-200'
                            }`}>
                            {day}
                          </span>
                          {dayReservations.length === 0 && !selected && (
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-600 transition-opacity">Click to book</span>
                          )}
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
                                className={`px-2 py-0.5 text-xs rounded truncate cursor-pointer transition-colors ${res.status === 'confirmed'
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
                              setDayPopup({ day, reservations: dayReservations, anchorRect: e.currentTarget.getBoundingClientRect() });
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

        {/* Selection Hint Footer */}
        <div className="px-3 sm:px-6 py-3 bg-[#16161c] border-t border-gray-800 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <div className="text-xs sm:text-sm text-gray-400">
            {selectedDates.start ? (
              selectedDates.end
                ? <span>Selected: <strong className="text-blue-400">{formatDate(selectedDates.start)}</strong> to <strong className="text-blue-400">{formatDate(selectedDates.end)}</strong></span>
                : <span>Select end date or click again to book single day: <strong className="text-blue-400">{formatDate(selectedDates.start)}</strong></span>
            ) : (
              "Click on a day to start a reservation. Select a second day for multi-day booking."
            )}
          </div>
          {selectedDates.start && !selectedDates.end && (
            <Button onClick={() => {
              setSelectedDates({ start: selectedDates.start, end: selectedDates.start });
              setTimeout(() => setIsBookingModalOpen(true), 100);
            }} className="py-1 px-3 text-xs">
              Book {formatDate(selectedDates.start)}
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      {isAiBookingModalOpen && (
        <AIBookingModal
          courts={courts}
          onClose={() => setIsAiBookingModalOpen(false)}
          onSuccess={(prefillData) => {
            setIsAiBookingModalOpen(false);
            setAiPrefillData(prefillData);
            setSelectedDates({ start: prefillData.start, end: prefillData.end });
            setIsBookingModalOpen(true);
          }}
        />
      )}
      {isBookingModalOpen && (
        <BookingModal
          courts={courts}
          reservations={reservations}
          onClose={() => { setIsBookingModalOpen(false); setAiPrefillData(null); }}
          selectedDates={selectedDates}
          initialData={aiPrefillData}
          onProceed={handleInitiateBooking}
        />
      )}
      {isPaymentModalOpen && pendingBookingInfo && (
        <PaymentModal
          bookingInfo={pendingBookingInfo}
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      )}
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
          onAdminUpdate={async (id, updates) => {
            try {
              await updateReservation(id, updates);
              setSelectedReservation(null);
            } catch (err) {
              setBookingError('Update failed: ' + err.message);
            }
          }}
        />
      )}
    </>
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

export default CalendarPage;
