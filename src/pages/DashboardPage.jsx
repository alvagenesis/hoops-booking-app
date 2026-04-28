import {
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import { formatDate } from '../lib/utils';
import { useReservations } from '../hooks/useReservations';
import { useCourts } from '../hooks/useCourts';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user, role } = useAuth();
  const { reservations } = useReservations();
  const { courts } = useCourts();
  const navigate = useNavigate();

  const isAdmin = role === 'admin';

  const sortByLatestReservationDate = (a, b) => getSortTimestamp(b) - getSortTimestamp(a);

  const displayBookings = isAdmin
    ? [...reservations].sort(sortByLatestReservationDate).slice(0, 5)
    : [...reservations].filter(r => r.user_id === user?.id).sort(sortByLatestReservationDate).slice(0, 5);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyReservations = reservations.filter(r => {
    const d = new Date(r.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalRevenue = monthlyReservations.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
  const bookingCount = monthlyReservations.length;
  const pendingBookings = reservations.filter(r => ['pending_verification', 'pending', 'awaiting_payment'].includes(r.status)).length;
  const pendingPayments = reservations.filter(r => ['unpaid', 'partial'].includes(r.payment_status) || r.payment_review_status === 'pending').length;
  const userPaidTotal = displayBookings.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
  const paymentReviews = reservations.filter(r => r.payment_review_status === 'pending').length;
  const rejectedBookings = reservations.filter(r => r.payment_review_status === 'rejected').length;
  const todayBookings = reservations.filter(r => isReservationToday(r, now)).length;
  const activeCourts = courts.filter(court => court.is_active !== false).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Courts" value={courts.length} icon={MapPin} trend={`${courts.length} active`} />
        <StatCard title={isAdmin ? 'Bookings (This Month)' : 'My Total Bookings'} value={isAdmin ? bookingCount : displayBookings.length} icon={CalendarIcon} trend={isAdmin ? (bookingCount > 0 ? 'Active' : 'No bookings yet') : 'Your activity'} />
        <StatCard title={isAdmin ? 'Pending Bookings' : 'Pending Payments'} value={isAdmin ? pendingBookings : displayBookings.filter(r => ['unpaid', 'partial'].includes(r.payment_status) || r.payment_review_status === 'pending').length} icon={Clock} trend={isAdmin ? 'Needs review' : 'Settle before play'} />
        <StatCard title={isAdmin ? 'Revenue (MTD)' : 'Amount Paid'} value={isAdmin ? `₱ ${totalRevenue.toLocaleString()}` : `₱ ${userPaidTotal.toLocaleString()}`} icon={CreditCard} trend={isAdmin ? `${pendingPayments} payment cases open` : 'Tracked automatically'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-[#1a1a24] to-[#111116] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-600/10"></div>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-4 border border-blue-500/20">
                {isAdmin ? 'Admin Control Panel' : 'Sports Venue Booking'}
              </span>
              <h2 className="text-2xl font-bold text-gray-100 mb-2">
                {isAdmin ? 'Operations Dashboard' : 'Ready to Book Your Slot?'}
              </h2>
              <p className="text-gray-400 mb-6 max-w-md text-sm leading-relaxed">
                {isAdmin
                  ? 'Monitor pending bookings, review payments, and keep the day’s schedule under control.'
                  : 'Choose your court, submit your booking, and track payment status in one place.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => navigate(isAdmin ? '/courts' : '/book')}>
                  {isAdmin ? 'Manage Courts' : 'Book Now'}
                </Button>
                <Button variant="secondary" onClick={() => navigate('/calendar')}>
                  {isAdmin ? 'View Schedule' : 'Browse Calendar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-[#111116] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> {isAdmin ? 'Recent Activity' : 'My Recent Bookings'}
            </h3>
            <div className="space-y-4">
              {displayBookings.map((res) => {
                const dateRange = getReservationDateRange(res);
                const startDate = dateRange.start;
                const endDate = dateRange.end;
                return (
                  <div key={res.id} className="flex items-center justify-between p-3 rounded-lg bg-[#16161c] border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-200">{res.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {startDate ? formatDate(startDate) : 'Date pending'} {startDate && endDate && startDate.getTime() !== endDate.getTime() ? `- ${formatDate(endDate)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeStyles(res.status)}`}>
                        {res.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{res.payment_status || 'unpaid'} payment</p>
                    </div>
                  </div>
                );
              })}
              {displayBookings.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No recent bookings found.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111116] border border-gray-800 rounded-xl p-6 h-full min-h-[300px] flex flex-col">
            <h3 className="text-lg font-medium text-gray-100 mb-4 border-b border-gray-800 pb-2">{isAdmin ? 'Action Center' : 'Booking Snapshot'}</h3>
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1a1a24] rounded-full flex items-center justify-center border border-gray-800 relative shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#111116] rounded-full animate-pulse"></span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{isAdmin ? 'Operations Healthy' : 'Booking Tools Ready'}</p>
                  <p className="text-xs text-gray-500 mt-1">{isAdmin ? 'Live booking data is syncing.' : 'Your booking workspace is ready.'}</p>
                </div>
              </div>

              {isAdmin ? (
                <>
                  <div className="space-y-2">
                    <ActionMetric label="Payment reviews" value={paymentReviews} tone={paymentReviews > 0 ? 'yellow' : 'green'} onClick={() => navigate('/my-bookings?filter=payment_reviews')} />
                    <ActionMetric label="Rejected bookings" value={rejectedBookings} tone={rejectedBookings > 0 ? 'red' : 'green'} onClick={() => navigate('/my-bookings?filter=rejected_bookings')} />
                    <ActionMetric label="Bookings today" value={todayBookings} tone="blue" />
                    <ActionMetric label="Courts active" value={`${activeCourts}/${courts.length}`} tone={activeCourts === courts.length ? 'green' : 'yellow'} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <Button variant="primary" onClick={() => navigate('/transactions')}>Review Payments</Button>
                    <Button variant="secondary" onClick={() => navigate('/calendar')}>View Schedule</Button>
                    <Button variant="secondary" onClick={() => navigate('/courts')}>Manage Courts</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <ActionMetric label="Recent bookings" value={displayBookings.length} tone="blue" />
                  <ActionMetric label="Open payments" value={displayBookings.filter(r => ['unpaid', 'partial'].includes(r.payment_status) || r.payment_review_status === 'pending').length} tone="yellow" />
                  <Button variant="primary" className="w-full mt-3" onClick={() => navigate('/my-bookings')}>View My Bookings</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function ActionMetric({ label, value, tone, onClick }) {
  const toneStyles = {
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  };
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border border-gray-800 bg-[#16161c] px-3 py-2 text-left transition-colors ${onClick ? 'hover:border-gray-700 hover:bg-[#1d1d27]' : ''}`}
    >
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${toneStyles[tone] || toneStyles.blue}`}>
        {value}
      </span>
    </Component>
  );
}

function isReservationToday(reservation, today) {
  const { start, end } = getReservationDateRange(reservation);

  if (!start) {
    return false;
  }

  const compareEnd = end || start;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(compareEnd.getFullYear(), compareEnd.getMonth(), compareEnd.getDate()).getTime();

  return todayStart >= startTime && todayStart <= endTime;
}

function getSortTimestamp(reservation) {
  const { end, start } = getReservationDateRange(reservation);
  if (end) return end.getTime();
  if (start) return start.getTime();
  const created = reservation?.created_at ? new Date(reservation.created_at) : null;
  return created && !Number.isNaN(created.getTime()) ? created.getTime() : 0;
}

function getReservationDateRange(reservation) {
  if (reservation?.reservation_days?.length) {
    const sortedDates = reservation.reservation_days
      .map(day => new Date(`${day.date}T00:00:00`))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);

    return {
      start: sortedDates[0] || null,
      end: sortedDates[sortedDates.length - 1] || sortedDates[0] || null,
    };
  }

  const start = reservation?.start_date ? new Date(reservation.start_date) : (reservation?.start ? new Date(reservation.start) : null);
  const end = reservation?.end_date ? new Date(reservation.end_date) : (reservation?.end ? new Date(reservation.end) : start);

  return {
    start: start && !Number.isNaN(start.getTime()) ? start : null,
    end: end && !Number.isNaN(end.getTime()) ? end : (start && !Number.isNaN(start.getTime()) ? start : null),
  };
}

function statusBadgeStyles(status) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-500/10 text-green-400';
    case 'pending_verification':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'awaiting_payment':
      return 'bg-orange-500/10 text-orange-400';
    case 'completed':
      return 'bg-blue-500/10 text-blue-400';
    case 'cancelled':
      return 'bg-red-500/10 text-red-400';
    case 'no_show':
      return 'bg-slate-500/10 text-slate-400';
    default:
      return 'bg-yellow-500/10 text-yellow-400';
  }
}

export default DashboardPage;
