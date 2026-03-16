import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import BookingModal from '../modals/BookingModal';
import PaymentModal from '../modals/PaymentModal';
import AIBookingModal from '../modals/AIBookingModal';
import ReservationDetailModal from '../modals/ReservationDetailModal';
import { getDaysInMonth, getFirstDayOfMonth, formatDate, isSameDay, isDateInRange, DAYS_OF_WEEK } from '../lib/utils';
import { useReservations } from '../hooks/useReservations';
import { useCourts } from '../hooks/useCourts';
import { useAuth } from '../hooks/useAuth';

const CalendarPage = () => {
  const { user } = useAuth();
  const { reservations, createReservation, cancelReservation } = useReservations();
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

  // Handle header button actions via URL params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action) {
      // Move state updates to a microtask to avoid 'set-state-in-effect' warning
      Promise.resolve().then(() => {
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
    try {
      await createReservation({
        court_id: pendingBookingInfo.courtId,
        user_id: user.id,
        title: pendingBookingInfo.title,
        start_date: pendingBookingInfo.start.toISOString().split('T')[0],
        end_date: pendingBookingInfo.end.toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: paymentData.paymentStatus,
        paid_amount: paymentData.paidAmount,
        total_amount: pendingBookingInfo.totalAmount,
        payment_method: paymentData.paymentMethod,
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
      // Support start_date / end_date range
      const startRaw = res.start_date || res.start;
      const endRaw = res.end_date || res.end;
      if (!startRaw || !endRaw) return false;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (isNaN(start) || isNaN(end)) return false;
      return isDateInRange(date, start, end);
    });
  };

  return (
    <>
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
          <div className="min-w-[320px] h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-gray-800 bg-[#111116] sticky top-0 z-10">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wider uppercase border-r border-gray-800 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
              {calendarDays.map((day, idx) => {
                const dayReservations = getReservationsForDay(day);
                const isToday = day && isSameDay(new Date(year, month, day), new Date());
                const selected = isDateSelected(day);
                const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
                const isPast = day && new Date(year, month, day) < todayDate;

                let cellClass = "min-h-[60px] sm:min-h-[90px] md:min-h-[120px] p-1 sm:p-2 border-b border-r border-gray-800/50 last:border-r-0 relative transition-colors group ";
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

                        <div className="space-y-1 mt-1 z-10 relative">
                          {dayReservations.map((res, rIdx) => {
                            // Safe date resolution
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
                                className={`px-2 py-1 text-xs rounded truncate cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${res.status === 'confirmed'
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
        />
      )}
    </>
  );
};

export default CalendarPage;
