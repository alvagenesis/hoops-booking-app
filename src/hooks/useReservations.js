import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadPaymentProof } from '../lib/supabase';
import { INITIAL_RESERVATIONS } from '../lib/constants';
import { useAuth } from './useAuth';

function normalizeReservationShape(reservation) {
  return {
    ...reservation,
    payment_status: reservation.payment_status || 'unpaid',
    booking_source: reservation.booking_source || (reservation.user_id ? 'member' : 'guest'),
    is_guest_booking: reservation.is_guest_booking ?? !reservation.user_id,
    customer_name: reservation.customer_name || '',
    customer_phone: reservation.customer_phone || '',
    customer_email: reservation.customer_email || '',
  };
}

export function useReservations() {
  const { user, role, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!supabase) {
      setReservations(INITIAL_RESERVATIONS.map(normalizeReservationShape));
      setLoading(false);
      return;
    }

    const isAdmin = role === 'admin';
    let query = supabase
      .from('reservations')
      .select('*, courts(*), reservation_days(*)');

    // Admins see everything, users see only their own
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setReservations(data.map(normalizeReservationShape));
    } else {
      setReservations(INITIAL_RESERVATIONS.map(normalizeReservationShape));
    }
    setLoading(false);
  }, [user, role, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchReservations();
    }
  }, [fetchReservations, authLoading]);

  async function createReservation({ reservation, dates, paymentProofFile }) {
    if (!supabase) {
      const uploadedProof = paymentProofFile ? await uploadPaymentProof(paymentProofFile) : null;
      const newRes = normalizeReservationShape({
        id: crypto.randomUUID(),
        ...reservation,
        payment_proof_url: uploadedProof?.publicUrl || reservation.payment_proof_url || '',
        created_at: new Date().toISOString(),
        reservation_days: dates.map(d => ({ id: crypto.randomUUID(), reservation_id: 'mock', date: d })),
        courts: null,
      });
      setReservations(prev => [newRes, ...prev]);
      return newRes;
    }

    const isGuestBooking = reservation.user_id == null;
    const reservationPayload = {
      ...reservation,
      user_id: isGuestBooking ? null : reservation.user_id,
      booking_source: isGuestBooking ? 'guest' : (reservation.booking_source || 'member'),
      is_guest_booking: isGuestBooking ? true : Boolean(reservation.is_guest_booking),
      customer_name: reservation.customer_name || '',
      customer_phone: reservation.customer_phone || '',
      customer_email: reservation.customer_email || '',
      payment_notes: reservation.payment_notes || '',
    };

    if (paymentProofFile) {
      const tempProofId = crypto.randomUUID();
      const uploadedProof = await uploadPaymentProof(paymentProofFile, tempProofId);
      reservationPayload.payment_proof_url = uploadedProof.publicUrl;
    }

    const debugPayload = {
      user_id: reservationPayload.user_id,
      booking_source: reservationPayload.booking_source,
      is_guest_booking: reservationPayload.is_guest_booking,
      status: reservationPayload.status,
      payment_status: reservationPayload.payment_status,
      payment_method: reservationPayload.payment_method,
      customer_name: reservationPayload.customer_name,
      customer_phone: reservationPayload.customer_phone,
      customer_email: reservationPayload.customer_email,
    };

    // For guest bookings: pre-generate the UUID client-side so we never need
    // .select() after insert (anon users can't SELECT their own rows under most
    // RLS setups, and NULL = NULL evaluates to NULL, not true).
    if (isGuestBooking) {
      reservationPayload.id = reservationPayload.id || crypto.randomUUID();
    }
    const reservationId = reservationPayload.id;

    // Insert reservation
    if (isGuestBooking) {
      // Guest path: plain insert, no .select() — avoids SELECT RLS check entirely
      const { error: resError } = await supabase
        .from('reservations')
        .insert(reservationPayload);

      if (resError) {
        console.error('Guest reservation insert failed', { debugPayload, fullPayload: reservationPayload, dates, error: resError });
        throw new Error(`Reservation insert failed: ${resError.message}`);
      }
    } else {
      // Member path: insert + select (member SELECT policy works fine)
      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .insert(reservationPayload)
        .select()
        .single();

      if (resError) {
        console.error('Reservation insert failed', { debugPayload, fullPayload: reservationPayload, dates, error: resError });
        throw new Error(`Reservation insert failed: ${resError.message}`);
      }

      // Insert reservation days
      const dayRows = dates.map(d => ({ reservation_id: resData.id, date: d }));
      const { error: dayError } = await supabase.from('reservation_days').insert(dayRows);

      if (dayError) {
        console.error('Reservation day insert failed', { reservationId: resData.id, dayRows, error: dayError });
        await supabase.from('reservations').delete().eq('id', resData.id);
        throw new Error(`Reservation days insert failed: ${dayError.message}`);
      }

      await fetchReservations();
      return normalizeReservationShape(resData);
    }

    // Guest path continued: insert reservation days using pre-generated ID
    const dayRows = dates.map(d => ({ reservation_id: reservationId, date: d }));
    const { error: dayError } = await supabase.from('reservation_days').insert(dayRows);

    if (dayError) {
      console.error('Guest reservation day insert failed', { reservationId, dayRows, error: dayError });
      await supabase.from('reservations').delete().eq('id', reservationId);
      throw new Error(`Reservation days insert failed: ${dayError.message}`);
    }

    // Return a shape built from the payload — no DB round-trip needed
    return normalizeReservationShape({
      ...reservationPayload,
      created_at: new Date().toISOString(),
      reservation_days: dayRows,
      courts: null,
    });
  }

  async function cancelReservation(id) {
    if (!supabase) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
      return;
    }

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
  }

  async function updateReservation(id, updates) {
    if (!supabase) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      return;
    }

    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select('*, courts(*), reservation_days(*)')
      .single();
    if (error) throw error;
    setReservations(prev => prev.map(r => r.id === id ? normalizeReservationShape(data) : r));
    return normalizeReservationShape(data);
  }

  async function payReservation(id, amount, method, options = {}) {
    if (!supabase) {
      const uploadedProof = options.paymentProofFile ? await uploadPaymentProof(options.paymentProofFile, id) : null;
      setReservations(prev => prev.map(r => {
        if (r.id === id) {
          const newPaid = (r.paid_amount || 0) + amount;
          const status = uploadedProof ? 'for_verification' : (newPaid >= r.total_amount ? 'paid' : 'partial');
          return {
            ...r,
            paid_amount: newPaid,
            payment_status: status,
            payment_method: method,
            payment_notes: options.paymentNotes || r.payment_notes,
            payment_proof_url: uploadedProof?.publicUrl || r.payment_proof_url,
          };
        }
        return r;
      }));
      return;
    }

    const { data: currentRes } = await supabase
      .from('reservations')
      .select('paid_amount, total_amount')
      .eq('id', id)
      .single();

    const uploadedProof = options.paymentProofFile ? await uploadPaymentProof(options.paymentProofFile, id) : null;
    const newPaid = (currentRes?.paid_amount || 0) + amount;
    const status = uploadedProof ? 'for_verification' : (newPaid >= currentRes?.total_amount ? 'paid' : 'partial');

    const { data, error } = await supabase
      .from('reservations')
      .update({
        paid_amount: newPaid,
        payment_status: status,
        payment_method: method,
        payment_notes: options.paymentNotes,
        payment_proof_url: uploadedProof?.publicUrl,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setReservations(prev => prev.map(r => r.id === id ? data : r));
    return data;
  }

  return { reservations, loading, createReservation, cancelReservation, updateReservation, payReservation, refetch: fetchReservations };
}
