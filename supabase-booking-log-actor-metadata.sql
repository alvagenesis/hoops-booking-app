-- Adds actor metadata to new booking log entries.
-- Run this in the Supabase SQL editor for an existing database.

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
