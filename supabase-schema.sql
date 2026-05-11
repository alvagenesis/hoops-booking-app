-- HoopsBookingApp — Full Schema
-- Run this once in the Supabase SQL Editor to set up the entire database from scratch.
-- Safe to re-run: drops all tables and rebuilds cleanly.

BEGIN;

-- ============================================================
-- 0. CLEANUP
-- ============================================================
DROP TABLE IF EXISTS public.schedule_blocks CASCADE;
DROP TABLE IF EXISTS public.booking_logs CASCADE;
DROP TABLE IF EXISTS public.reservation_days CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.time_slot_configs CASCADE;
DROP TABLE IF EXISTS public.courts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_double_booking() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.protect_profile_role_changes() CASCADE;
DROP FUNCTION IF EXISTS public.append_booking_log(uuid, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_reservation_changes() CASCADE;
DROP FUNCTION IF EXISTS public.get_guest_reservation_by_access(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.guest_record_payment(uuid, text, text, numeric, text, text, text) CASCADE;

-- ============================================================
-- 1. PROFILES
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

-- ============================================================
-- 1.5 HELPER: is_admin()
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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  full_name text := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  resolved_first_name text := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name',
    ''
  );
  resolved_last_name text := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name',
    ''
  );
BEGIN
  IF resolved_first_name = '' AND full_name <> '' THEN
    resolved_first_name := split_part(full_name, ' ', 1);
  END IF;

  IF resolved_last_name = '' AND full_name <> '' AND position(' ' IN full_name) > 0 THEN
    resolved_last_name := substring(full_name from position(' ' IN full_name) + 1);
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, phone, address)
  VALUES (
    NEW.id,
    resolved_first_name,
    resolved_last_name,
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

-- Prevent regular members from granting themselves admin access through direct API calls.
CREATE OR REPLACE FUNCTION public.protect_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change profile roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_changes ON public.profiles;
CREATE TRIGGER protect_profile_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_changes();

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
  title text DEFAULT '' CHECK (char_length(title) <= 100),
  notes text DEFAULT '',
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification', 'pending', 'awaiting_payment', 'confirmed', 'completed', 'cancelled', 'no_show')),
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_review_status text DEFAULT 'not_submitted'
    CHECK (payment_review_status IN ('not_submitted', 'pending', 'approved', 'rejected')),
  pending_payment_amount numeric DEFAULT 0,
  payment_method text
    CHECK (payment_method IN ('gcash', 'maya', 'cash', 'bank_transfer', 'walk_in')),
  pending_payment_method text
    CHECK (pending_payment_method IN ('gcash', 'maya', 'cash', 'bank_transfer', 'walk_in')),
  payment_proof_url text,
  pending_payment_proof_url text,
  payment_notes text,
  pending_payment_notes text,
  payment_reviewed_at timestamptz,
  customer_name text CHECK (customer_name IS NULL OR char_length(customer_name) <= 80),
  customer_phone text,
  customer_email text CHECK (customer_email IS NULL OR char_length(customer_email) <= 80),
  booking_source text DEFAULT 'member',
  is_guest_booking boolean DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.booking_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_logs_reservation_created
  ON public.booking_logs(reservation_id, created_at DESC);

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

CREATE OR REPLACE FUNCTION public.append_booking_log(
  p_reservation_id uuid,
  p_event_type text,
  p_title text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_name text := '';
  v_actor_role text := 'system';
  v_is_guest_booking boolean := false;
  v_customer_name text := '';
BEGIN
  SELECT
    COALESCE(r.is_guest_booking, false),
    COALESCE(r.customer_name, '')
  INTO v_is_guest_booking, v_customer_name
  FROM public.reservations r
  WHERE r.id = p_reservation_id;

  IF v_actor_id IS NOT NULL THEN
    SELECT
      trim(concat_ws(' ', p.first_name, p.last_name)),
      COALESCE(p.role, 'user')
    INTO v_actor_name, v_actor_role
    FROM public.profiles p
    WHERE p.id = v_actor_id;

    v_actor_name := COALESCE(NULLIF(v_actor_name, ''), 'User ...' || right(v_actor_id::text, 6));
  ELSIF v_is_guest_booking THEN
    v_actor_name := COALESCE(NULLIF(v_customer_name, ''), 'Guest');
    v_actor_role := 'guest';
  ELSE
    v_actor_name := 'System';
    v_actor_role := 'system';
  END IF;

  INSERT INTO public.booking_logs (reservation_id, event_type, title, description, metadata)
  VALUES (
    p_reservation_id,
    p_event_type,
    p_title,
    COALESCE(p_description, ''),
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'actor_id', v_actor_id,
      'actor_name', v_actor_name,
      'actor_role', v_actor_role
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_reservation_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_submission_label text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.append_booking_log(
      NEW.id,
      'booking_created',
      'Booking created',
      'Booking was created and the selected slot is now reserved.',
      jsonb_build_object(
        'status', NEW.status,
        'payment_status', NEW.payment_status,
        'payment_review_status', NEW.payment_review_status
      )
    );

    IF COALESCE(NEW.pending_payment_amount, 0) > 0 THEN
      payment_submission_label := CASE
        WHEN COALESCE(NEW.pending_payment_amount, 0) >= COALESCE(NEW.total_amount, 0) THEN 'Full payment'
        WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'Remaining balance'
        ELSE 'Deposit'
      END;

      PERFORM public.append_booking_log(
        NEW.id,
        'payment_submitted',
        payment_submission_label || ' in review',
        payment_submission_label || ' was submitted for payment verification.',
        jsonb_build_object(
          'amount', NEW.pending_payment_amount,
          'method', NEW.pending_payment_method,
          'payment_status', NEW.payment_status
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  IF COALESCE(OLD.pending_payment_amount, 0) = 0
     AND COALESCE(NEW.pending_payment_amount, 0) > 0
     AND NEW.payment_review_status = 'pending' THEN
    payment_submission_label := CASE
      WHEN (COALESCE(OLD.paid_amount, 0) + COALESCE(NEW.pending_payment_amount, 0)) >= COALESCE(NEW.total_amount, 0) THEN
        CASE WHEN COALESCE(OLD.paid_amount, 0) > 0 THEN 'Remaining balance' ELSE 'Full payment' END
      ELSE 'Deposit'
    END;

    PERFORM public.append_booking_log(
      NEW.id,
      'payment_submitted',
      payment_submission_label || ' in review',
      payment_submission_label || ' was submitted for payment verification.',
      jsonb_build_object(
        'amount', NEW.pending_payment_amount,
        'method', NEW.pending_payment_method,
        'payment_status', NEW.payment_status
      )
    );
  END IF;

  IF OLD.payment_review_status IS DISTINCT FROM NEW.payment_review_status THEN
    IF NEW.payment_review_status = 'approved' THEN
      PERFORM public.append_booking_log(
        NEW.id,
        'payment_reviewed',
        'Payment reviewed',
        'The latest submitted payment was approved.',
        jsonb_build_object(
          'from', OLD.payment_review_status,
          'to', NEW.payment_review_status
        )
      );
    ELSIF NEW.payment_review_status = 'rejected' THEN
      PERFORM public.append_booking_log(
        NEW.id,
        'payment_reviewed',
        'Payment reviewed',
        'The latest submitted payment was rejected.',
        jsonb_build_object(
          'from', OLD.payment_review_status,
          'to', NEW.payment_review_status
        )
      );
    END IF;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        PERFORM public.append_booking_log(
          NEW.id,
          'booking_confirmed',
          'Booking confirmed',
          'Booking was confirmed and is ready for the scheduled date.',
          jsonb_build_object('from', OLD.status, 'to', NEW.status)
        );
      WHEN 'completed' THEN
        PERFORM public.append_booking_log(
          NEW.id,
          'booking_completed',
          'Booking completed',
          'Booking was marked as completed.',
          jsonb_build_object('from', OLD.status, 'to', NEW.status)
        );
      WHEN 'cancelled' THEN
        PERFORM public.append_booking_log(
          NEW.id,
          'booking_cancelled',
          'Booking cancelled',
          'Booking was cancelled.',
          jsonb_build_object('from', OLD.status, 'to', NEW.status)
        );
      WHEN 'no_show' THEN
        PERFORM public.append_booking_log(
          NEW.id,
          'booking_no_show',
          'Booking marked no-show',
          'Booking was marked as no-show.',
          jsonb_build_object('from', OLD.status, 'to', NEW.status)
        );
      ELSE
        NULL;
    END CASE;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    CASE NEW.payment_status
      WHEN 'partial' THEN
        IF NEW.payment_review_status = 'approved' THEN
          PERFORM public.append_booking_log(
            NEW.id,
            'deposit_verified',
            'Deposit verified',
            'The booking now has a verified deposit.',
            jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status)
          );
        END IF;
      WHEN 'paid' THEN
        IF COALESCE(NEW.paid_amount, 0) >= COALESCE(NEW.total_amount, 0) THEN
          PERFORM public.append_booking_log(
            NEW.id,
            'fully_paid',
            'Fully paid',
            'The booking is now fully paid.',
            jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status)
          );
        END IF;
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservation_change_logs ON public.reservations;
CREATE TRIGGER reservation_change_logs
  AFTER INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.log_reservation_changes();

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

-- Prevent conflicts: same court, same date, overlapping reservation or schedule block
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_court_id uuid;
  new_start_time time;
  new_end_time time;
BEGIN
  SELECT court_id, start_time, end_time
  INTO new_court_id, new_start_time, new_end_time
  FROM public.reservations
  WHERE id = NEW.reservation_id;

  IF EXISTS (
    SELECT 1 FROM public.reservation_days rd
    JOIN public.reservations r ON r.id = rd.reservation_id
    WHERE rd.date = NEW.date
      AND r.court_id = new_court_id
      AND r.id != NEW.reservation_id
      AND r.status NOT IN ('cancelled', 'no_show')
      AND (new_start_time, new_end_time) OVERLAPS (r.start_time, r.end_time)
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked for the selected date';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schedule_blocks sb
    WHERE sb.court_id = new_court_id
      AND sb.date = NEW.date
      AND (new_start_time, new_end_time) OVERLAPS (sb.start_time, sb.end_time)
  ) THEN
    RAISE EXCEPTION 'This time slot is blocked for the selected date';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_double_booking ON public.reservation_days;
CREATE TRIGGER check_double_booking
  BEFORE INSERT ON public.reservation_days
  FOR EACH ROW EXECUTE FUNCTION public.prevent_double_booking();

-- Availability check — SECURITY DEFINER bypasses RLS so all users (incl. guests) see other bookings
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_court_id uuid, p_date date)
RETURNS TABLE(start_time time, end_time time, source text, reason text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.start_time, r.end_time, 'reservation'::text, NULL::text
  FROM public.reservation_days rd
  JOIN public.reservations r ON r.id = rd.reservation_id
  WHERE rd.date = p_date
    AND r.court_id = p_court_id
    AND r.status NOT IN ('cancelled', 'no_show')
  UNION ALL
  SELECT sb.start_time, sb.end_time, 'block'::text, sb.reason
  FROM public.schedule_blocks sb
  WHERE sb.court_id = p_court_id
    AND sb.date = p_date;
$$;

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND COALESCE(role, 'user') = 'user');

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
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;

-- Members see their own; admins see all; guests see their own guest rows
CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- Anon guests can select their own guest reservations (required for FK checks in reservation_days/addons insert policies)
CREATE POLICY "reservations_guest_select" ON public.reservations
  FOR SELECT USING (
    auth.uid() IS NULL AND user_id IS NULL AND COALESCE(is_guest_booking, false) = true
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

CREATE POLICY "booking_logs_select" ON public.booking_logs
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

CREATE POLICY "booking_logs_admin" ON public.booking_logs
  FOR ALL USING (public.is_admin());

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
GRANT SELECT ON public.reservations TO anon;
GRANT SELECT ON public.booking_logs TO anon;
GRANT INSERT ON public.reservations TO anon;
GRANT INSERT ON public.reservation_days TO anon;

-- ============================================================
-- 10. AMENITIES & RESERVATION ADD-ONS
-- ============================================================
DROP TABLE IF EXISTS public.reservation_addons CASCADE;
DROP TABLE IF EXISTS public.amenities CASCADE;

CREATE TABLE public.amenities (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text DEFAULT '',
  price       numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  icon        text DEFAULT 'star',
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.reservation_addons (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id   uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  amenity_id       uuid REFERENCES public.amenities(id) ON DELETE RESTRICT NOT NULL,
  price_at_booking numeric NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT unique_addon_per_reservation UNIQUE (reservation_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_addons_reservation
  ON public.reservation_addons(reservation_id);

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amenities_select_all"  ON public.amenities FOR SELECT USING (true);
CREATE POLICY "amenities_admin_write" ON public.amenities FOR ALL    USING (public.is_admin());

ALTER TABLE public.reservation_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservation_addons_select" ON public.reservation_addons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (
      r.user_id = auth.uid() OR public.is_admin()
    )
  )
);
CREATE POLICY "reservation_addons_insert" ON public.reservation_addons FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (
      (auth.uid() IS NOT NULL AND r.user_id = auth.uid())
      OR (auth.uid() IS NULL AND r.user_id IS NULL AND COALESCE(r.is_guest_booking, false) = true)
    )
  )
);
CREATE POLICY "reservation_addons_admin" ON public.reservation_addons FOR ALL USING (public.is_admin());

GRANT SELECT ON public.amenities TO anon;
GRANT INSERT ON public.reservation_addons TO anon;

-- ============================================================
-- 10.25 REALTIME SETUP NOTES
-- ============================================================
-- Enable Supabase Realtime for these tables in Dashboard > Database > Replication:
--   - public.reservations
--   - public.reservation_days
--   - public.reservation_addons
--   - public.booking_logs
--
-- The app subscribes to these tables so member/admin booking lists and guest
-- booking detail pages refresh after payment submissions, admin review actions,
-- date changes, add-on changes, and booking log inserts.
--
-- Optional: enable Realtime for these admin-managed setup tables only if you want
-- other open browser tabs to live-refresh after schedule/court configuration edits:
--   - public.courts
--   - public.time_slot_configs
--   - public.schedule_blocks
--   - public.amenities
--
-- Note: Realtime still respects table RLS for Postgres changes. Keep the RLS
-- policies above aligned with what each user role is allowed to see.

-- ============================================================
-- 10.5 GUEST ACCESS RPCS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_guest_reservation_by_access(
  lookup_reference text,
  lookup_phone text
)
RETURNS TABLE (
  id uuid,
  court_id uuid,
  user_id uuid,
  title text,
  notes text,
  start_time time,
  end_time time,
  status text,
  total_amount numeric,
  paid_amount numeric,
  payment_status text,
  payment_review_status text,
  pending_payment_amount numeric,
  payment_method text,
  pending_payment_method text,
  payment_proof_url text,
  pending_payment_proof_url text,
  payment_notes text,
  pending_payment_notes text,
  customer_name text,
  customer_phone text,
  customer_email text,
  booking_source text,
  is_guest_booking boolean,
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  courts jsonb,
  reservation_days jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.court_id,
    r.user_id,
    r.title,
    r.notes,
    r.start_time,
    r.end_time,
    r.status,
    r.total_amount,
    r.paid_amount,
    r.payment_status,
    r.payment_review_status,
    r.pending_payment_amount,
    r.payment_method,
    r.pending_payment_method,
    r.payment_proof_url,
    r.pending_payment_proof_url,
    r.payment_notes,
    r.pending_payment_notes,
    r.customer_name,
    r.customer_phone,
    r.customer_email,
    r.booking_source,
    r.is_guest_booking,
    r.confirmed_at,
    r.confirmed_by,
    r.created_at,
    r.updated_at,
    to_jsonb(c) AS courts,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', rd.id,
          'reservation_id', rd.reservation_id,
          'date', rd.date,
          'created_at', rd.created_at
        )
        ORDER BY rd.date
      )
      FROM public.reservation_days rd
      WHERE rd.reservation_id = r.id
    ), '[]'::jsonb) AS reservation_days
  FROM public.reservations r
  LEFT JOIN public.courts c ON c.id = r.court_id
  WHERE r.user_id IS NULL
    AND COALESCE(r.is_guest_booking, false) = true
    AND upper(left(replace(r.id::text, '-', ''), 8)) = upper(regexp_replace(COALESCE(lookup_reference, ''), '[^A-Za-z0-9]', '', 'g'))
    AND regexp_replace(COALESCE(r.customer_phone, ''), '\\D', '', 'g') = regexp_replace(COALESCE(lookup_phone, ''), '\\D', '', 'g')
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.guest_record_payment(
  reservation_id_input uuid,
  lookup_reference text,
  lookup_phone text,
  new_pending_payment_amount numeric,
  new_pending_payment_method text,
  new_pending_payment_notes text,
  new_pending_payment_proof_url text
)
RETURNS SETOF public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.reservations%ROWTYPE;
  normalized_reference text;
  normalized_phone text;
BEGIN
  normalized_reference := upper(regexp_replace(COALESCE(lookup_reference, ''), '[^A-Za-z0-9]', '', 'g'));
  normalized_phone := regexp_replace(COALESCE(lookup_phone, ''), '\\D', '', 'g');

  SELECT *
  INTO target
  FROM public.reservations r
  WHERE r.id = reservation_id_input
    AND r.user_id IS NULL
    AND COALESCE(r.is_guest_booking, false) = true
    AND upper(left(replace(r.id::text, '-', ''), 8)) = normalized_reference
    AND regexp_replace(COALESCE(r.customer_phone, ''), '\\D', '', 'g') = normalized_phone
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest booking access denied';
  END IF;

  IF target.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled bookings can no longer accept payment';
  END IF;

  IF target.status IN ('completed', 'no_show') THEN
    RAISE EXCEPTION 'This booking can no longer accept payment';
  END IF;

  IF target.payment_status = 'paid' THEN
    RAISE EXCEPTION 'This booking is already fully handled for payment';
  END IF;

  IF target.payment_review_status = 'pending' THEN
    RAISE EXCEPTION 'Your last payment is still awaiting verification';
  END IF;

  IF new_pending_payment_amount IS NULL OR new_pending_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF (target.paid_amount + new_pending_payment_amount) > target.total_amount THEN
    RAISE EXCEPTION 'Paid amount cannot exceed total amount';
  END IF;

  IF target.paid_amount > 0 AND target.payment_status = 'partial' AND (target.paid_amount + new_pending_payment_amount) < target.total_amount THEN
    RAISE EXCEPTION 'Partial payment can only be used once. Please pay the full remaining balance.';
  END IF;

  UPDATE public.reservations r
  SET pending_payment_amount = new_pending_payment_amount,
      pending_payment_method = new_pending_payment_method,
      pending_payment_notes = COALESCE(new_pending_payment_notes, ''),
      pending_payment_proof_url = COALESCE(new_pending_payment_proof_url, r.pending_payment_proof_url),
      payment_review_status = 'pending',
      payment_reviewed_at = NULL
  WHERE r.id = target.id;

  RETURN QUERY
  SELECT * FROM public.reservations WHERE id = target.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_reservation_by_access(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_record_payment(uuid, text, text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_reservation_by_access(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_record_payment(uuid, text, text, numeric, text, text, text) TO anon, authenticated;

-- ============================================================
-- 11. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('payment-proofs', 'payment-proofs', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "payment_proofs_select" ON storage.objects;
CREATE POLICY "payment_proofs_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "payment_proofs_insert" ON storage.objects;
CREATE POLICY "payment_proofs_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "payment_proofs_update" ON storage.objects;
CREATE POLICY "payment_proofs_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'payment-proofs')
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 12. SEED DATA
-- ============================================================
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
