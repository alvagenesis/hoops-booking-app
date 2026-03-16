-- HoopsHQ RLS Fix — Fixes 500 errors caused by self-referencing policies
-- Run this in your Supabase SQL Editor

-- 1. Create a SECURITY DEFINER helper to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Fix PROFILES policies (remove self-referencing)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Fix COURTS policies
DROP POLICY IF EXISTS "Anyone can view active courts" ON public.courts;
DROP POLICY IF EXISTS "Admins can manage courts" ON public.courts;

CREATE POLICY "Anyone can view active courts" ON public.courts
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage courts" ON public.courts
  FOR ALL USING (public.is_admin());

-- 4. Fix RESERVATIONS policies
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.reservations;

CREATE POLICY "Users can view own reservations" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create reservations" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reservations" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- 5. Fix RESERVATION_DAYS policies
DROP POLICY IF EXISTS "Users can view own reservation days" ON public.reservation_days;
DROP POLICY IF EXISTS "Users can create reservation days" ON public.reservation_days;
DROP POLICY IF EXISTS "Admins can manage all reservation days" ON public.reservation_days;

CREATE POLICY "Users can view own reservation days" ON public.reservation_days
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.reservations WHERE id = reservation_id AND (user_id = auth.uid() OR public.is_admin()))
  );

CREATE POLICY "Users can create reservation days" ON public.reservation_days
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.reservations WHERE id = reservation_id AND user_id = auth.uid())
  );

-- 6. Fix TIME_SLOT_CONFIGS policies
DROP POLICY IF EXISTS "Anyone can view time slot configs" ON public.time_slot_configs;
DROP POLICY IF EXISTS "Admins can manage time slot configs" ON public.time_slot_configs;

CREATE POLICY "Anyone can view time slot configs" ON public.time_slot_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage time slot configs" ON public.time_slot_configs
  FOR ALL USING (public.is_admin());

-- 7. Add missing columns (from patch)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS "pricePerDay" numeric DEFAULT 0;
UPDATE public.courts SET "pricePerDay" = hourly_rate * 8 WHERE "pricePerDay" = 0 OR "pricePerDay" IS NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS end_date date;
