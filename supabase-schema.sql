-- HoopsBookingApp — Full Schema
-- Run this once in the Supabase SQL Editor to set up the entire database from scratch.
-- Safe to re-run: drops all tables and rebuilds cleanly.

BEGIN;

-- ============================================================
-- 0. CLEANUP
-- ============================================================
DROP TABLE IF EXISTS public.schedule_blocks CASCADE;
DROP TABLE IF EXISTS public.reservation_days CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.time_slot_configs CASCADE;
DROP TABLE IF EXISTS public.courts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_double_booking() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================
-- 1. HELPER: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name text,
  last_name text,
  phone text,
  address text,
  avatar_url text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. COURTS
-- ============================================================
CREATE TABLE public.courts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#8B5CF6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  hourly_rate numeric NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TIME SLOT CONFIGS
-- ============================================================
CREATE TABLE public.time_slot_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL DEFAULT '06:00',
  end_time time NOT NULL DEFAULT '22:00',
  slot_duration_minutes integer NOT NULL DEFAULT 60 CHECK (slot_duration_minutes IN (30, 60, 90, 120)),
  is_active boolean DEFAULT true,
  CONSTRAINT unique_court_day UNIQUE (court_id, day_of_week),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- ============================================================
-- 5. RESERVATIONS
-- ============================================================
CREATE TABLE public.reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- nullable for guests
  title text DEFAULT '',
  notes text DEFAULT '',
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'awaiting_payment'
    CHECK (status IN ('pending', 'awaiting_payment', 'confirmed', 'completed', 'cancelled', 'no_show')),
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'for_verification', 'paid', 'rejected')),
  payment_method text
    CHECK (payment_method IN ('gcash', 'maya', 'cash', 'bank_transfer', 'walk_in')),
  payment_proof_url text,
  payment_notes text,
  customer_name text,
  customer_phone text,
  customer_email text,
  booking_source text DEFAULT 'member',
  is_guest_booking boolean DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_updated_at ON public.reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. RESERVATION DAYS
-- ============================================================
CREATE TABLE public.reservation_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_days_date ON public.reservation_days(date);
CREATE INDEX IF NOT EXISTS idx_reservation_days_reservation_id ON public.reservation_days(reservation_id);

-- Prevent double-booking: same court, same date, overlapping time
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reservation_days rd
    JOIN public.reservations r ON r.id = rd.reservation_id
    WHERE rd.date = NEW.date
      AND r.court_id = (SELECT court_id FROM public.reservations WHERE id = NEW.reservation_id)
      AND r.id != NEW.reservation_id
      AND r.status NOT IN ('cancelled', 'no_show')
      AND (
        (SELECT start_time FROM public.reservations WHERE id = NEW.reservation_id),
        (SELECT end_time FROM public.reservations WHERE id = NEW.reservation_id)
      ) OVERLAPS (r.start_time, r.end_time)
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked for the selected date';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_double_booking ON public.reservation_days;
CREATE TRIGGER check_double_booking
  BEFORE INSERT ON public.reservation_days
  FOR EACH ROW EXECUTE FUNCTION public.prevent_double_booking();

-- ============================================================
-- 7. SCHEDULE BLOCKS
-- ============================================================
CREATE TABLE public.schedule_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text DEFAULT '',
  block_type text NOT NULL DEFAULT 'manual_block'
    CHECK (block_type IN ('maintenance', 'private_event', 'manual_block')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT schedule_blocks_valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_court_date ON public.schedule_blocks(court_id, date);

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- COURTS
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courts_select_all" ON public.courts
  FOR SELECT USING (true);

CREATE POLICY "courts_admin_write" ON public.courts
  FOR ALL USING (public.is_admin());

-- TIME SLOT CONFIGS
ALTER TABLE public.time_slot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_slot_configs_select_all" ON public.time_slot_configs
  FOR SELECT USING (true);

CREATE POLICY "time_slot_configs_admin_write" ON public.time_slot_configs
  FOR ALL USING (public.is_admin());

-- RESERVATIONS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Members see their own; admins see all; guests see their own guest rows
CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (auth.uid() IS NULL AND user_id IS NULL AND COALESCE(is_guest_booking, false) = true)
  );

-- Members insert their own; guests insert with null user_id + is_guest_booking = true
CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND COALESCE(is_guest_booking, false) = false)
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND COALESCE(is_guest_booking, false) = true AND COALESCE(booking_source, 'guest') = 'guest')
  );

CREATE POLICY "reservations_update" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "reservations_delete" ON public.reservations
  FOR DELETE USING (public.is_admin());

-- RESERVATION DAYS
ALTER TABLE public.reservation_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservation_days_select" ON public.reservation_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND (
          r.user_id = auth.uid()
          OR public.is_admin()
          OR (auth.uid() IS NULL AND r.user_id IS NULL AND COALESCE(r.is_guest_booking, false) = true)
        )
    )
  );

CREATE POLICY "reservation_days_insert" ON public.reservation_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND (
          (auth.uid() IS NOT NULL AND r.user_id = auth.uid())
          OR
          (auth.uid() IS NULL AND r.user_id IS NULL AND COALESCE(r.is_guest_booking, false) = true)
        )
    )
  );

CREATE POLICY "reservation_days_admin" ON public.reservation_days
  FOR ALL USING (public.is_admin());

-- SCHEDULE BLOCKS
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon guests) can read blocks — needed for booking wizard
CREATE POLICY "schedule_blocks_select" ON public.schedule_blocks
  FOR SELECT USING (true);

CREATE POLICY "schedule_blocks_insert" ON public.schedule_blocks
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "schedule_blocks_update" ON public.schedule_blocks
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "schedule_blocks_delete" ON public.schedule_blocks
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- 9. GRANTS (anon role for guest booking)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.courts TO anon;
GRANT SELECT ON public.time_slot_configs TO anon;
GRANT SELECT ON public.schedule_blocks TO anon;
GRANT INSERT, SELECT ON public.reservations TO anon;
GRANT INSERT, SELECT ON public.reservation_days TO anon;

-- ============================================================
-- 10. SEED DATA
-- ============================================================
INSERT INTO public.courts (name, description, color, hourly_rate, sort_order) VALUES
  ('YMCA Indoor Court', 'Full-size hardwood court with professional lighting', '#8B5CF6', 500, 1),
  ('YMCA Outdoor Street Court', 'Open-air court with concrete surface', '#F97316', 300, 2)
ON CONFLICT DO NOTHING;

-- Default time slot configs for each court (all days, 6 AM – 10 PM, 60-min slots)
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
