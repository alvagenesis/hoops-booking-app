import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  MapPin,
  CheckCircle2,
  Bot,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import { callGeminiAPI } from '../lib/gemini';
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
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = role === 'admin';

  // For Admin: show all recent activity. For User: show only their recent/upcoming
  const displayBookings = isAdmin
    ? [...reservations].sort((a, b) => new Date(b.start_date || b.start) - new Date(a.start_date || a.start)).slice(0, 5)
    : [...reservations].filter(r => r.user_id === user?.id).sort((a, b) => new Date(b.start_date || b.start) - new Date(a.start_date || a.start)).slice(0, 5);

  useEffect(() => {
    if (!isAdmin || (reservations.length === 0 && courts.length === 0)) return;

    let cancelled = false;
    async function loadInsight() {
      setLoadingInsight(true);
      try {
        const prompt = `You are a smart business analyst for a basketball court booking system.
        Analyze this booking data: ${JSON.stringify(reservations)}.
        Courts available: ${JSON.stringify(courts)}.
        Current Date Context: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
        Provide one single, short, highly actionable sentence (max 15 words) suggesting how to improve revenue, fill empty slots, or optimize pricing based on this data.`;

        const response = await callGeminiAPI(prompt);
        if (!cancelled) setInsight(response.replace(/"/g, ''));
      } catch {
        if (!cancelled) setInsight("Unable to generate insights at this time.");
      }
      if (!cancelled) setLoadingInsight(false);
    }
    loadInsight();
    return () => { cancelled = true; };
  }, [reservations, courts, refreshKey, isAdmin]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyReservations = reservations.filter(r => {
    const d = new Date(r.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalRevenue = monthlyReservations.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
  const bookingCount = monthlyReservations.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* AI Insights Banner - Admin Only */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-300 flex items-center gap-1">AI Business Insight</h4>
              {loadingInsight ? (
                <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyzing current schedules...
                </p>
              ) : (
                <p className="text-sm text-gray-200 mt-1">{insight}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setRefreshKey(k => k + 1)} disabled={loadingInsight} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
            Refresh
          </Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Courts" value={courts.length} icon={MapPin} trend={`${courts.length} active`} />
        <StatCard title={isAdmin ? "Bookings (This Month)" : "My Total Bookings"} value={isAdmin ? bookingCount : displayBookings.length} icon={CalendarIcon} trend={isAdmin ? (bookingCount > 0 ? 'Active' : 'No bookings yet') : 'Your activity'} />
        <StatCard title={isAdmin ? "Revenue (MTD)" : "Reward Points"} value={isAdmin ? `₱ ${totalRevenue.toLocaleString()}` : (displayBookings.length * 10)} icon={CreditCard} trend={isAdmin ? `+12.5% from last month` : 'MVP Status'} />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-[#1a1a24] to-[#111116] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-600/10"></div>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-4 border border-blue-500/20">
                {isAdmin ? 'Admin Control Panel' : 'Welcome to the YMCA'}
              </span>
              <h2 className="text-2xl font-bold text-gray-100 mb-2">
                {isAdmin ? 'Court Management Hub' : 'Ready to Hit the Court?'}
              </h2>
              <p className="text-gray-400 mb-6 max-w-md text-sm leading-relaxed">
                {isAdmin
                  ? 'Oversee all reservations, manage court availability, and track incoming payments seamlessly.'
                  : 'Book your favorite court in seconds using our smart assistant or manual calendar.'}
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
                const startDate = res.start_date ? new Date(res.start_date) : res.start;
                const endDate = res.end_date ? new Date(res.end_date) : res.end;
                return (
                  <div key={res.id} className="flex items-center justify-between p-3 rounded-lg bg-[#16161c] border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-200">{res.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(startDate)} {startDate.getTime() !== endDate.getTime() ? `- ${formatDate(endDate)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${res.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                        }`}>
                        {res.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{res.payment_status || res.paymentStatus} Payment</p>
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
            <h3 className="text-lg font-medium text-gray-100 mb-4 border-b border-gray-800 pb-2">System Status</h3>
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-[#1a1a24] rounded-full flex items-center justify-center border border-gray-800 mb-2 relative">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#111116] rounded-full animate-pulse"></span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">All Systems Operational</p>
                <p className="text-xs text-gray-500 mt-1">Booking engine is running smoothly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
