// Mock data matching the new schema for demo mode

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

export const INITIAL_RESERVATIONS = [
  {
    id: 'r1', court_id: 'c1', user_id: 'demo', title: 'Weekend Tournament',
    notes: 'Bring jerseys', start_time: '09:00', end_time: '11:00',
    status: 'confirmed', total_amount: 1000, created_at: new Date().toISOString(),
    reservation_days: [
      { id: 'rd1', reservation_id: 'r1', date: tomorrow.toISOString().split('T')[0] },
      { id: 'rd2', reservation_id: 'r1', date: nextWeek.toISOString().split('T')[0] },
    ],
    courts: MOCK_COURTS[0],
  },
  {
    id: 'r2', court_id: 'c2', user_id: 'demo', title: 'Evening Pickup Game',
    notes: '', start_time: '17:00', end_time: '18:00',
    status: 'confirmed', total_amount: 300, created_at: new Date().toISOString(),
    reservation_days: [
      { id: 'rd3', reservation_id: 'r2', date: today.toISOString().split('T')[0] },
    ],
    courts: MOCK_COURTS[1],
  },
];
