import { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Users,
  UserCircle,
  MapPin,
  X,
  Sparkles,
  Loader2,
  BookOpen,
  ClipboardList,
  Clock,
  CreditCard,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import Button from './components/ui/Button';
import NavItem from './components/NavItem';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import MembersPage from './pages/MembersPage';
import ProfilePage from './pages/ProfilePage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import CourtsPage from './pages/CourtsPage';
import SchedulePage from './pages/SchedulePage';
import TransactionsPage from './pages/TransactionsPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import MyBookingPage from './pages/MyBookingPage';
import { venueConfig } from './lib/venueConfig';

function AppLayout() {
  const { displayName, role, profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = role === 'admin';

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const pageTitle = () => {
    if (location.pathname.startsWith('/calendar')) return 'Court Schedule';
    if (location.pathname.startsWith('/members')) return 'Members';
    if (location.pathname.startsWith('/courts')) return 'Court Management';
    if (location.pathname.startsWith('/schedule')) return 'Facility Scheduling';
    if (location.pathname.startsWith('/transactions')) return 'Revenue & Transactions';
    if (location.pathname.startsWith('/book')) return 'Book a Court';
    if (location.pathname.startsWith('/my-bookings')) return 'My Bookings';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-gray-200 font-sans overflow-hidden">
      {/* Sidebar Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside aria-label="Main navigation" className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111116] border-r border-gray-800 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <img src={venueConfig.logoPath} alt={`${venueConfig.name} Logo`} className="h-8 w-auto object-contain drop-shadow-sm" />
          </div>
          <button aria-label="Close sidebar" className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]" role="navigation">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">Bookings</p>
            <NavItem icon={LayoutDashboard} label="Dashboard" to="/dashboard" />
            <NavItem icon={BookOpen} label="Book Court" to="/book" />
            <NavItem icon={ClipboardList} label="My Bookings" to="/my-bookings" />
            <NavItem icon={CalendarIcon} label="Calendar" to="/calendar" />
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">Management</p>
              <NavItem icon={MapPin} label="Manage Courts" to="/courts" />
              <NavItem icon={Clock} label="Facility Schedule" to="/schedule" />
              <NavItem icon={DollarSign} label="Revenue & Transactions" to="/transactions" />
              <NavItem icon={Users} label="Members" to="/members" />
            </div>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800 bg-[#111116]">
          <div className="flex items-center gap-3 px-3 py-2">
            <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium hover:ring-2 hover:ring-blue-500 transition-all overflow-hidden" title="Edit Profile">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{role}</p>
            </div>
            <button aria-label="Sign out" onClick={signOut} className="text-gray-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button aria-label="Open sidebar" className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-100">
              {pageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/calendar?action=smart-book')} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-none">
              <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Smart Book</span>
            </Button>
            <Button onClick={() => navigate('/calendar?action=new-booking')} className="gap-2">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Booking</span>
            </Button>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <Routes>
      <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />

      {/* Public routes — show AppLayout when logged in, standalone when guest */}
      <Route element={user ? <AppLayout /> : <Outlet />}>
        <Route path="/book" element={<BookingPage />} />
        <Route path="/booking-success" element={<BookingSuccessPage />} />
        <Route path="/my-booking" element={<MyBookingPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>

      <Route element={user ? <AppLayout /> : <Navigate to="/login" />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />

        {/* Admin only routes */}
        <Route path="/members" element={isAdmin ? <MembersPage /> : <Navigate to="/dashboard" />} />
        <Route path="/courts" element={isAdmin ? <CourtsPage /> : <Navigate to="/dashboard" />} />
        <Route path="/schedule" element={isAdmin ? <SchedulePage /> : <Navigate to="/dashboard" />} />
        <Route path="/transactions" element={isAdmin ? <TransactionsPage /> : <Navigate to="/dashboard" />} />

        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/book'} />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/book'} />} />
    </Routes>
  );
}
