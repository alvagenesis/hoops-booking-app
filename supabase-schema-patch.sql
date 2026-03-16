-- HoopsHQ Schema Patch
-- Run this in your Supabase SQL Editor to add missing columns

-- 1. Add avatar_url to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add pricePerDay to courts (used by the booking modal)
ALTER TABLE public.courts 
  ADD COLUMN IF NOT EXISTS "pricePerDay" numeric default 0;

-- 3. Update existing courts to set pricePerDay from hourly_rate (8hr day estimate)
UPDATE public.courts 
  SET "pricePerDay" = hourly_rate * 8 
  WHERE "pricePerDay" = 0 OR "pricePerDay" IS NULL;

-- 4. Add start_date and end_date to reservations (used by calendar view)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- 5. Create the avatars storage bucket (if using avatar uploads)
-- Note: You may need to manually create this in Storage → New Bucket → "avatars" (set to Public)
