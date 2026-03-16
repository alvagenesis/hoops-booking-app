-- HoopsHQ MVP Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 0. CLEANUP (drop existing tables in reverse dependency order)
-- ============================================================
drop table if exists public.reservation_days cascade;
drop table if exists public.reservations cascade;
drop table if exists public.time_slot_configs cascade;
drop table if exists public.courts cascade;
drop table if exists public.profiles cascade;

drop function if exists public.prevent_double_booking() cascade;
drop function if exists public.update_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text,
  last_name text,
  phone text,
  address text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'address', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. COURTS
-- ============================================================
create table if not exists public.courts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  color text default '#8B5CF6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  hourly_rate numeric not null default 0 check (hourly_rate >= 0),
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- 3. TIME SLOT CONFIGS
-- ============================================================
create table if not exists public.time_slot_configs (
  id uuid default gen_random_uuid() primary key,
  court_id uuid references public.courts(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null default '06:00',
  end_time time not null default '22:00',
  slot_duration_minutes integer not null default 60 check (slot_duration_minutes in (30, 60, 90, 120)),
  is_active boolean default true,
  constraint unique_court_day unique (court_id, day_of_week),
  constraint valid_time_range check (start_time < end_time)
);

-- ============================================================
-- 4. RESERVATIONS
-- ============================================================
create table if not exists public.reservations (
  id uuid default gen_random_uuid() primary key,
  court_id uuid references public.courts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default '',
  notes text default '',
  start_time time not null,
  end_time time not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  total_amount numeric default 0,
  paid_amount numeric default 0,
  payment_status text default 'pending' check (payment_status in ('pending', 'partial', 'full')),
  payment_method text check (payment_method in ('gcash', 'maya', 'stripe', 'cash')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 5. RESERVATION DAYS
-- ============================================================
create table if not exists public.reservation_days (
  id uuid default gen_random_uuid() primary key,
  reservation_id uuid references public.reservations(id) on delete cascade not null,
  date date not null,
  created_at timestamptz default now()
);

-- Prevent double-booking: same court, same date, overlapping time
create or replace function public.prevent_double_booking()
returns trigger as $$
begin
  if exists (
    select 1 from public.reservation_days rd
    join public.reservations r on r.id = rd.reservation_id
    where rd.date = new.date
      and r.court_id = (select court_id from public.reservations where id = new.reservation_id)
      and r.id != new.reservation_id
      and r.status not in ('cancelled')
      and (
        (select start_time from public.reservations where id = new.reservation_id),
        (select end_time from public.reservations where id = new.reservation_id)
      ) overlaps (r.start_time, r.end_time)
  ) then
    raise exception 'This time slot is already booked for the selected date';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists check_double_booking on public.reservation_days;
create trigger check_double_booking
  before insert on public.reservation_days
  for each row execute function public.prevent_double_booking();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at
  before update on public.reservations
  for each row execute function public.update_updated_at();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- Profiles
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Courts (all authenticated users can view)
alter table public.courts enable row level security;

drop policy if exists "Anyone can view active courts" on public.courts;
create policy "Anyone can view active courts" on public.courts
  for select using (true);

drop policy if exists "Admins can manage courts" on public.courts;
create policy "Admins can manage courts" on public.courts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Time Slot Configs
alter table public.time_slot_configs enable row level security;

drop policy if exists "Anyone can view time slot configs" on public.time_slot_configs;
create policy "Anyone can view time slot configs" on public.time_slot_configs
  for select using (true);

drop policy if exists "Admins can manage time slot configs" on public.time_slot_configs;
create policy "Admins can manage time slot configs" on public.time_slot_configs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Reservations
alter table public.reservations enable row level security;

drop policy if exists "Users can view own reservations" on public.reservations;
create policy "Users can view own reservations" on public.reservations
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create reservations" on public.reservations;
create policy "Users can create reservations" on public.reservations
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own reservations" on public.reservations;
create policy "Users can update own reservations" on public.reservations
  for update using (auth.uid() = user_id);

drop policy if exists "Admins can manage all reservations" on public.reservations;
create policy "Admins can manage all reservations" on public.reservations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Reservation Days
alter table public.reservation_days enable row level security;

drop policy if exists "Users can view own reservation days" on public.reservation_days;
create policy "Users can view own reservation days" on public.reservation_days
  for select using (
    exists (select 1 from public.reservations where id = reservation_id and user_id = auth.uid())
  );

drop policy if exists "Users can create reservation days" on public.reservation_days;
create policy "Users can create reservation days" on public.reservation_days
  for insert with check (
    exists (select 1 from public.reservations where id = reservation_id and user_id = auth.uid())
  );

drop policy if exists "Admins can manage all reservation days" on public.reservation_days;
create policy "Admins can manage all reservation days" on public.reservation_days
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 7. SEED DATA
-- ============================================================
insert into public.courts (name, description, color, hourly_rate, sort_order) values
  ('Main Indoor Court', 'Full-size hardwood court with professional lighting', '#8B5CF6', 500, 1),
  ('Outdoor Street Court', 'Open-air court with concrete surface', '#F97316', 300, 2)
on conflict do nothing;

-- Default time slot configs for each court (Mon-Sun, 6AM-10PM, 60min slots)
do $$
declare
  court_record record;
  day_num integer;
begin
  for court_record in select id from public.courts loop
    for day_num in 0..6 loop
      insert into public.time_slot_configs (court_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
      values (court_record.id, day_num, '06:00', '22:00', 60, true)
      on conflict (court_id, day_of_week) do nothing;
    end loop;
  end loop;
end $$;
