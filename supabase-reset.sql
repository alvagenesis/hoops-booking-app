-- HoopsBookingApp — Reset Script
-- Truncates all data tables and clears storage buckets.
-- Preserves: auth.users, public.profiles (user accounts and roles are kept).
-- Run in Supabase SQL Editor.

BEGIN;

-- ============================================================
-- 1. TRUNCATE DATA TABLES (order respects foreign keys)
-- ============================================================
TRUNCATE public.reservation_addons RESTART IDENTITY CASCADE;
TRUNCATE public.booking_logs        RESTART IDENTITY CASCADE;
TRUNCATE public.reservation_days   RESTART IDENTITY CASCADE;
TRUNCATE public.reservations       RESTART IDENTITY CASCADE;
TRUNCATE public.schedule_blocks    RESTART IDENTITY CASCADE;
TRUNCATE public.time_slot_configs  RESTART IDENTITY CASCADE;
TRUNCATE public.courts             RESTART IDENTITY CASCADE;
TRUNCATE public.amenities          RESTART IDENTITY CASCADE;

-- ============================================================
-- 2. CLEAR STORAGE BUCKETS
-- ============================================================
-- Supabase does not allow direct SQL deletion from storage.
-- To clear payment proofs: go to Supabase Dashboard → Storage → payment-proofs → select all → delete.

-- ============================================================
-- 3. RE-SEED DEFAULT VENUE DATA
-- ============================================================
-- Edit these court names/rates per venue before running the reset for a new instance.
INSERT INTO public.courts (name, description, color, hourly_rate, sort_order) VALUES
  ('Main Indoor Court', 'Full-size hardwood court with professional lighting', '#8B5CF6', 500, 1),
  ('Outdoor Street Court', 'Open-air court with concrete surface', '#F97316', 300, 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.amenities (name, description, price, icon, sort_order) VALUES
  ('Scoreboard',            'Electronic scoreboard display',        200, 'monitor',     1),
  ('Electric Fan',          'Industrial-grade electric fan',        150, 'wind',        2),
  ('Aircon',                'Full air-conditioning for the court',  500, 'thermometer', 3),
  ('Lights',                'Professional court lighting',          100, 'lamp',        4),
  ('Projector',             'Overhead projector + screen',          400, 'projector',   5),
  ('Drinking Water Supply', 'Unlimited water dispenser station',    100, 'droplets',    6)
ON CONFLICT DO NOTHING;

-- Default time slot configs for each court (all days, 6 AM - 10 PM, 60-min slots)
DO $$
DECLARE
  court_record record;
  day_num integer;
BEGIN
  FOR court_record IN SELECT id FROM public.courts LOOP
    FOR day_num IN 0..6 LOOP
      INSERT INTO public.time_slot_configs (court_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
      VALUES (court_record.id, day_num, '06:00', '22:00', 60, true)
      ON CONFLICT (court_id, day_of_week) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

COMMIT;
