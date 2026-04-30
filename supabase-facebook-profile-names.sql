-- Patch existing projects so OAuth signups, including Google and Facebook, save profile names.
-- Run this in the Supabase SQL Editor without resetting the database.

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

-- Backfill existing empty profile names from auth user metadata.
UPDATE public.profiles p
SET
  first_name = CASE
    WHEN COALESCE(p.first_name, '') <> '' THEN p.first_name
    WHEN COALESCE(u.raw_user_meta_data->>'first_name', '') <> '' THEN u.raw_user_meta_data->>'first_name'
    WHEN COALESCE(u.raw_user_meta_data->>'given_name', '') <> '' THEN u.raw_user_meta_data->>'given_name'
    WHEN COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') <> '' THEN
      split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ' ', 1)
    ELSE p.first_name
  END,
  last_name = CASE
    WHEN COALESCE(p.last_name, '') <> '' THEN p.last_name
    WHEN COALESCE(u.raw_user_meta_data->>'last_name', '') <> '' THEN u.raw_user_meta_data->>'last_name'
    WHEN COALESCE(u.raw_user_meta_data->>'family_name', '') <> '' THEN u.raw_user_meta_data->>'family_name'
    WHEN position(' ' IN COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')) > 0 THEN
      substring(
        COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
        from position(' ' IN COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')) + 1
      )
    ELSE p.last_name
  END
FROM auth.users u
WHERE p.id = u.id
  AND (
    COALESCE(p.first_name, '') = ''
    OR COALESCE(p.last_name, '') = ''
  );
