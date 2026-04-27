import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadPaymentProof } from '../lib/supabase';
import { INITIAL_RESERVATIONS } from '../lib/constants';
import { useAuth } from './useAuth';
import { useGlobalLoading } from '../contexts/LoadingContext';
import { normalizePaymentState } from '../lib/paymentUtils';

function normalizeReservationShape(reservation) {
  return normalizePaymentState({
    ...reservation,
    booking_source: reservation.booking_source || (reservation.user_id ? 'member' : 'guest'),
    is_guest_booking: reservation.is_guest_booking ?? !reservation.user_id,
    customer_name: reservation.customer_name || '',
    customer_phone: reservation.customer_phone || '',
    customer_email: reservation.customer_email || '',
    booking_logs: Array.isArray(reservation.booking_logs) ? reservation.booking_logs : [],
  });
}

function buildAddonRows(reservationId, addons = []) {
  return addons.map(a => ({
    reservation_id: reservationId,
    amenity_id: a.amenity_id,
    price_at_booking: a.price_at_booking,
    amenities: a.amenities ? { name: a.amenities.name } : (a.name ? { name: a.name } : undefined),
  }));
}

function stripAddonInsertFields(addons = []) {
  return addons.map(({ reservation_id, amenity_id, price_at_booking }) => ({
    reservation_id,
    amenity_id,
    price_at_booking,
  }));
}

async function rollbackReservationTree(reservationId) {
  if (!supabase || !reservationId) return;

  await supabase.from('reservation_addons').delete().eq('reservation_id', reservationId);
  await supabase.from('reservation_days').delete().eq('reservation_id', reservationId);
  await supabase.from('reservations').delete().eq('id', reservationId);
}

export function useReservations() {
  const { user, role, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const { track } = useGlobalLoading();
  const refreshTimeoutRef = useRef(null);

  const fetchReservations = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setReservations([]);
      setLastUpdatedAt(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!supabase) {
      setReservations(INITIAL_RESERVATIONS.map(normalizeReservationShape));
      setLastUpdatedAt(new Date().toISOString());
      setLoading(false);
      return;
    }

    await track(async () => {
      const isAdmin = role === 'admin';
      let query = supabase
        .from('reservations')
        .select('*, courts(*), reservation_days(*), reservation_addons(*, amenities(name)), booking_logs(*)');

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        setReservations(data.map(normalizeReservationShape));
        setLastUpdatedAt(new Date().toISOString());
      } else {
        setReservations(INITIAL_RESERVATIONS.map(normalizeReservationShape));
        setLastUpdatedAt(new Date().toISOString());
      }
    });
    setLoading(false);
  }, [user, role, authLoading, track]);

  useEffect(() => {
    if (authLoading) return undefined;

    const timeoutId = setTimeout(() => {
      fetchReservations();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchReservations, authLoading]);

  useEffect(() => {
    if (authLoading || !user || !supabase) return undefined;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        fetchReservations();
      }, 150);
    };

    const channel = supabase
      .channel(`reservations-live-${role || 'member'}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_days' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_addons' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_logs' },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [authLoading, user, role, fetchReservations]);

  async function createReservation({ reservation, dates, paymentProofFile, addons = [] }) {
    if (Number(reservation?.pending_payment_amount || 0) <= 0) {
      throw new Error('A deposit or full payment is required before a booking can be created.');
    }

    if (!supabase) {
      const uploadedProof = paymentProofFile ? await uploadPaymentProof(paymentProofFile) : null;
      const newRes = normalizeReservationShape({
        id: crypto.randomUUID(),
        ...reservation,
        status: reservation.status || 'pending_verification',
        payment_status: reservation.payment_status || (reservation.pending_payment_amount >= reservation.total_amount ? 'paid' : 'partial'),
        payment_review_status: 'pending',
        payment_proof_url: reservation.payment_proof_url || '',
        pending_payment_proof_url: uploadedProof?.publicUrl || reservation.pending_payment_proof_url || '',
        created_at: new Date().toISOString(),
        reservation_days: dates.map(d => ({ id: crypto.randomUUID(), reservation_id: 'mock', date: d })),
        reservation_addons: addons.map(a => ({ id: crypto.randomUUID(), amenity_id: a.amenity_id, price_at_booking: a.price_at_booking })),
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
      status: reservation.status || 'pending_verification',
      payment_status: reservation.payment_status || (reservation.pending_payment_amount >= reservation.total_amount ? 'paid' : 'partial'),
      payment_review_status: 'pending',
    };

    if (paymentProofFile) {
      const tempProofId = crypto.randomUUID();
      const uploadedProof = await uploadPaymentProof(paymentProofFile, tempProofId);
      reservationPayload.pending_payment_proof_url = uploadedProof.publicUrl;
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

      let addonRows = [];
      if (addons.length > 0) {
        addonRows = buildAddonRows(resData.id, addons);
        const { error: addonError } = await supabase
          .from('reservation_addons')
          .insert(stripAddonInsertFields(addonRows));

        if (addonError) {
          console.error('Addon insert failed (member)', { reservationId: resData.id, addonRows, error: addonError });
          await rollbackReservationTree(resData.id);
          throw new Error(`Reservation add-ons insert failed: ${addonError.message}`);
        }
      }

      const createdReservation = normalizeReservationShape({
        ...resData,
        reservation_days: dayRows,
        reservation_addons: addonRows,
      });

      setReservations(prev => [createdReservation, ...prev.filter(r => r.id !== createdReservation.id)]);
      await fetchReservations();
      return createdReservation;
    }

    // Guest path continued: insert reservation days using pre-generated ID
    const dayRows = dates.map(d => ({ reservation_id: reservationId, date: d }));
    const { error: dayError } = await supabase.from('reservation_days').insert(dayRows);

    if (dayError) {
      console.error('Guest reservation day insert failed', { reservationId, dayRows, error: dayError });
      await supabase.from('reservations').delete().eq('id', reservationId);
      throw new Error(`Reservation days insert failed: ${dayError.message}`);
    }

    let addonRows = [];
    if (addons.length > 0) {
      addonRows = buildAddonRows(reservationId, addons);
      const { error: addonError } = await supabase
        .from('reservation_addons')
        .insert(stripAddonInsertFields(addonRows));

      if (addonError) {
        console.error('Addon insert failed (guest)', { reservationId, addonRows, error: addonError });
        await rollbackReservationTree(reservationId);
        throw new Error(`Reservation add-ons insert failed: ${addonError.message}`);
      }
    }

    // Return a shape built from the payload — no DB round-trip needed
    return normalizeReservationShape({
      ...reservationPayload,
      created_at: new Date().toISOString(),
      reservation_days: dayRows,
      reservation_addons: addonRows,
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
      .select('*, courts(*), reservation_days(*), reservation_addons(*, amenities(name)), booking_logs(*)')
      .single();
    if (error) throw error;
    setReservations(prev => prev.map(r => r.id === id ? normalizeReservationShape(data) : r));
    return normalizeReservationShape(data);
  }

  async function payReservation(id, amount, method, options = {}) {
    const buildPaymentState = (reservation, paymentAmount) => {
      const currentPaid = reservation?.paid_amount || 0;
      const totalAmount = reservation?.total_amount || 0;
      const currentStatus = reservation?.status;
      const currentReviewStatus = reservation?.payment_review_status || 'not_submitted';
      const remainingBalance = Math.max(totalAmount - currentPaid, 0);
      const hasVerifiedDeposit = currentStatus === 'confirmed' && currentPaid > 0 && currentPaid < totalAmount;
      const canRetryInitialPayment = currentStatus === 'pending_verification' && currentReviewStatus === 'rejected';

      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
      }

      if (['cancelled', 'completed', 'no_show'].includes(currentStatus)) {
        throw new Error('This booking can no longer accept payment.');
      }

      if (currentReviewStatus === 'pending') {
        throw new Error('Your last payment is still awaiting verification.');
      }

      if (paymentAmount > remainingBalance) {
        throw new Error('Payment amount cannot exceed the remaining balance.');
      }

      if (!canRetryInitialPayment && !hasVerifiedDeposit) {
        throw new Error('Payment submission is not available for this booking right now.');
      }

      if (hasVerifiedDeposit && paymentAmount < remainingBalance) {
        throw new Error('After a verified deposit, the next payment must settle the full remaining balance.');
      }

      return { reservationStatus: currentStatus };
    };

    if (!supabase) {
      const uploadedProof = options.paymentProofFile ? await uploadPaymentProof(options.paymentProofFile, id) : null;
      let caughtError = null;

      setReservations(prev => prev.map(r => {
        if (r.id === id) {
          try {
            const { reservationStatus } = buildPaymentState(r, amount);
            return {
              ...r,
              payment_review_status: 'pending',
              pending_payment_amount: amount,
              status: reservationStatus,
              pending_payment_method: method,
              pending_payment_notes: options.paymentNotes || '',
              pending_payment_proof_url: uploadedProof?.publicUrl || '',
            };
          } catch (error) {
            caughtError = error;
          }
        }
        return r;
      }));

      if (caughtError) throw caughtError;
      return;
    }

    const { data: currentRes } = await supabase
      .from('reservations')
      .select('paid_amount, total_amount, status, payment_review_status')
      .eq('id', id)
      .single();

    const uploadedProof = options.paymentProofFile ? await uploadPaymentProof(options.paymentProofFile, id) : null;
    const { reservationStatus } = buildPaymentState(currentRes, amount);

    const updatePayload = {
      payment_review_status: 'pending',
      pending_payment_amount: amount,
      pending_payment_method: method,
      pending_payment_notes: options.paymentNotes,
      ...(uploadedProof?.publicUrl ? { pending_payment_proof_url: uploadedProof.publicUrl } : {}),
      ...(reservationStatus ? { status: reservationStatus } : {}),
    };

    const { data, error } = await supabase
      .from('reservations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setReservations(prev => prev.map(r => r.id === id ? data : r));
    return data;
  }

  return { reservations, loading, lastUpdatedAt, createReservation, cancelReservation, updateReservation, payReservation, refetch: fetchReservations };
}
