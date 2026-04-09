-- HoopsBookingApp — Reset Script
-- Truncates all data tables and clears storage buckets.
-- Preserves: auth.users, public.profiles (user accounts and roles are kept).
-- Run in Supabase SQL Editor.

BEGIN;

-- ============================================================
-- 1. TRUNCATE DATA TABLES (order respects foreign keys)
-- ============================================================
TRUNCATE public.reservation_days  RESTART IDENTITY CASCADE;
TRUNCATE public.reservations      RESTART IDENTITY CASCADE;
TRUNCATE public.schedule_blocks   RESTART IDENTITY CASCADE;
TRUNCATE public.time_slot_configs RESTART IDENTITY CASCADE;
TRUNCATE public.courts            RESTART IDENTITY CASCADE;

-- ============================================================
-- 2. CLEAR STORAGE BUCKETS
-- ============================================================
-- Supabase does not allow direct SQL deletion from storage.
-- To clear payment proofs: go to Supabase Dashboard → Storage → payment-proofs → select all → delete.

COMMIT;
