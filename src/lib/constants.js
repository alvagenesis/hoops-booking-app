// Mock data matching the new schema for demo mode
import { formatLocalDate } from './utils';

export const MOCK_COURTS = [
  { id: 'c1', name: 'Main Indoor Court', description: 'Full-size hardwood court with professional lighting', color: '#3B82F6', hourly_rate: 500, is_active: true, sort_order: 1 },
  { id: 'c2', name: 'Outdoor Street Court', description: 'Open-air court with concrete surface', color: '#F97316', hourly_rate: 300, is_active: true, sort_order: 2 },
];

// Generate time slot configs for demo mode (7 days, 6AM-10PM, 60 min)
export const MOCK_TIME_SLOT_CONFIGS = MOCK_COURTS.flatMap(court =>
  Array.from({ length: 7 }, (_, day) => ({
    id: `ts-${court.id}-${day}`,
    court_id: court.id,
    day_of_week: day,
    start_time: '06:00',
    end_time: '22:00',
    slot_duration_minutes: 60,
    is_active: true,
  }))
);

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

export const MOCK_SCHEDULE_BLOCKS = [
  {
    id: 'sb1',
    court_id: 'c1',
    date: formatLocalDate(today),
    start_time: '12:00',
    end_time: '13:00',
    reason: 'Cleaning and maintenance',
    block_type: 'maintenance',
  },
];

export const MOCK_AMENITIES = [
  { id: 'a1', name: 'Scoreboard',            description: 'Electronic scoreboard display',       price: 200, icon: 'monitor',     is_active: true, sort_order: 1 },
  { id: 'a2', name: 'Electric Fan',          description: 'Industrial-grade electric fan',       price: 150, icon: 'wind',        is_active: true, sort_order: 2 },
  { id: 'a3', name: 'Aircon',                description: 'Full air-conditioning for the court', price: 500, icon: 'thermometer', is_active: true, sort_order: 3 },
  { id: 'a4', name: 'Lights',                description: 'Professional court lighting',         price: 100, icon: 'lamp',        is_active: true, sort_order: 4 },
  { id: 'a5', name: 'Projector',             description: 'Overhead projector + screen',         price: 400, icon: 'projector',   is_active: true, sort_order: 5 },
  { id: 'a6', name: 'Drinking Water Supply', description: 'Unlimited water dispenser station',   price: 100, icon: 'droplets',    is_active: true, sort_order: 6 },
];

export const INITIAL_RESERVATIONS = [
  {
    id: 'r1', court_id: 'c1', user_id: 'demo', title: 'Weekend Tournament',
    notes: 'Bring jerseys', start_time: '09:00', end_time: '11:00',
    status: 'confirmed', total_amount: 1000, paid_amount: 1000, payment_status: 'paid', payment_review_status: 'approved', pending_payment_amount: 0, payment_method: 'cash',
    customer_name: 'Juan Dela Cruz', customer_phone: '09171234567', customer_email: 'juan.delacruz@example.com',
    booking_source: 'member', is_guest_booking: false,
    created_at: new Date().toISOString(),
    reservation_days: [
      { id: 'rd1', reservation_id: 'r1', date: formatLocalDate(tomorrow) },
      { id: 'rd2', reservation_id: 'r1', date: formatLocalDate(nextWeek) },
    ],
    booking_logs: [
      { id: 'bl1', reservation_id: 'r1', event_type: 'booking_created', title: 'Booking created', description: 'Booking was created and the selected slot is now reserved.', created_at: new Date(today.getTime() - 1000 * 60 * 90).toISOString() },
      { id: 'bl2', reservation_id: 'r1', event_type: 'payment_reviewed', title: 'Payment reviewed', description: 'The latest submitted payment was approved.', created_at: new Date(today.getTime() - 1000 * 60 * 70).toISOString() },
      { id: 'bl3', reservation_id: 'r1', event_type: 'booking_confirmed', title: 'Booking confirmed', description: 'Booking was confirmed and is ready for the scheduled date.', created_at: new Date(today.getTime() - 1000 * 60 * 65).toISOString() },
      { id: 'bl4', reservation_id: 'r1', event_type: 'fully_paid', title: 'Fully paid', description: 'The booking is now fully paid.', created_at: new Date(today.getTime() - 1000 * 60 * 60).toISOString() },
    ],
    courts: MOCK_COURTS[0],
  },
  {
    id: 'r2', court_id: 'c2', user_id: null, title: 'Evening Pickup Game',
    notes: '', start_time: '17:00', end_time: '18:00',
    status: 'confirmed', total_amount: 300, paid_amount: 150, payment_status: 'partial', payment_review_status: 'approved', pending_payment_amount: 0, payment_method: 'gcash',
    customer_name: 'Maria Santos', customer_phone: '09981234567', customer_email: 'maria.santos@example.com',
    booking_source: 'guest', is_guest_booking: true,
    created_at: new Date().toISOString(),
    reservation_days: [
      { id: 'rd3', reservation_id: 'r2', date: formatLocalDate(today) },
    ],
    booking_logs: [
      { id: 'bl5', reservation_id: 'r2', event_type: 'booking_created', title: 'Booking created', description: 'Booking was created and the selected slot is now reserved.', created_at: new Date(today.getTime() - 1000 * 60 * 50).toISOString() },
      { id: 'bl6', reservation_id: 'r2', event_type: 'payment_reviewed', title: 'Payment reviewed', description: 'The latest submitted payment was approved.', created_at: new Date(today.getTime() - 1000 * 60 * 40).toISOString() },
      { id: 'bl7', reservation_id: 'r2', event_type: 'booking_confirmed', title: 'Booking confirmed', description: 'Booking was confirmed and is ready for the scheduled date.', created_at: new Date(today.getTime() - 1000 * 60 * 35).toISOString() },
      { id: 'bl8', reservation_id: 'r2', event_type: 'deposit_verified', title: 'Deposit verified', description: 'The booking now has a verified deposit.', created_at: new Date(today.getTime() - 1000 * 60 * 30).toISOString() },
    ],
    courts: MOCK_COURTS[1],
  },
];
