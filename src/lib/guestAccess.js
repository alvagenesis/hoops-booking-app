import { supabase } from './supabase';
import { normalizePhone } from './utils';

const SESSION_KEY = 'guest_booking_access_v1';

function readMap() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(map));
}

function buildGuestToken(reference, phone) {
  const ref = String(reference || '').replace(/-/g, '').trim().toUpperCase();
  const normalizedPhone = normalizePhone(phone);
  return `${ref}:${normalizedPhone}`;
}

export function rememberGuestAccess({ reservationId, reference, phone }) {
  if (!reservationId || !reference || !phone || typeof window === 'undefined') return;

  const map = readMap();
  map[reservationId] = {
    token: buildGuestToken(reference, phone),
    reference: String(reference || '').replace(/-/g, '').trim().toUpperCase(),
    phone: normalizePhone(phone),
    touchedAt: Date.now(),
  };
  writeMap(map);
}

export function getRememberedGuestAccess(reservationId) {
  if (!reservationId) return null;
  const entry = readMap()[reservationId];
  return entry || null;
}

export async function fetchGuestBookingByAccess({ reference, phone }) {
  if (!supabase) return null;

  const normalizedReference = String(reference || '').replace(/-/g, '').trim().toUpperCase();
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedReference || !normalizedPhone) {
    throw new Error('Reference and phone are required.');
  }

  const { data, error } = await supabase
    .rpc('get_guest_reservation_by_access', {
      lookup_reference: normalizedReference,
      lookup_phone: normalizedPhone,
    });

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data || null;
}

export async function updateGuestBookingPayment({ reservationId, reference, phone, updates }) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const normalizedReference = String(reference || '').replace(/-/g, '').trim().toUpperCase();
  const normalizedPhone = normalizePhone(phone);

  if (!reservationId || !normalizedReference || !normalizedPhone) {
    throw new Error('Guest payment update requires reservation access details.');
  }

  const payload = {
    reservation_id_input: reservationId,
    lookup_reference: normalizedReference,
    lookup_phone: normalizedPhone,
    new_pending_payment_amount: updates.pending_payment_amount,
    new_pending_payment_method: updates.pending_payment_method || null,
    new_pending_payment_notes: updates.pending_payment_notes || '',
    new_pending_payment_proof_url: updates.pending_payment_proof_url || null,
  };

  const { data, error } = await supabase.rpc('guest_record_payment', payload);

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data || null;
}
