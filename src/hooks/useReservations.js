import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { INITIAL_RESERVATIONS } from '../lib/constants';
import { useAuth } from './useAuth';

export function useReservations() {
  const { user, role } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    if (!user) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!supabase) {
      setReservations(INITIAL_RESERVATIONS);
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
      setReservations(data);
    } else {
      setReservations(INITIAL_RESERVATIONS);
    }
    setLoading(false);
  }, [user, role]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  async function createReservation({ reservation, dates }) {
    if (!supabase) {
      const newRes = {
        id: crypto.randomUUID(),
        ...reservation,
        created_at: new Date().toISOString(),
        reservation_days: dates.map(d => ({ id: crypto.randomUUID(), reservation_id: 'mock', date: d })),
        courts: null,
      };
      setReservations(prev => [newRes, ...prev]);
      return newRes;
    }

    // Insert reservation
    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single();
    if (resError) throw resError;

    // Insert reservation days
    const dayRows = dates.map(d => ({ reservation_id: resData.id, date: d }));
    const { error: dayError } = await supabase
      .from('reservation_days')
      .insert(dayRows);

    if (dayError) {
      // Rollback: delete the reservation if days fail
      await supabase.from('reservations').delete().eq('id', resData.id);
      throw dayError;
    }

    await fetchReservations();
    return resData;
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
      .select()
      .single();
    if (error) throw error;
    setReservations(prev => prev.map(r => r.id === id ? data : r));
    return data;
  }

  async function payReservation(id, amount, method) {
    if (!supabase) {
      setReservations(prev => prev.map(r => {
        if (r.id === id) {
          const newPaid = (r.paid_amount || 0) + amount;
          const status = newPaid >= r.total_amount ? 'full' : 'partial';
          return { ...r, paid_amount: newPaid, payment_status: status, payment_method: method };
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

    const newPaid = (currentRes?.paid_amount || 0) + amount;
    const status = newPaid >= currentRes?.total_amount ? 'full' : 'partial';

    const { data, error } = await supabase
      .from('reservations')
      .update({
        paid_amount: newPaid,
        payment_status: status,
        payment_method: method
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
