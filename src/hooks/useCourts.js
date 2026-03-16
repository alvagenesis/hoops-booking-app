import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_COURTS } from '../lib/constants';

export function useCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setCourts(MOCK_COURTS);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .order('sort_order');

    if (!error && data) {
      setCourts(data);
    } else {
      setCourts(MOCK_COURTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  async function addCourt(court) {
    if (!supabase) {
      const newCourt = { id: crypto.randomUUID(), ...court, created_at: new Date().toISOString() };
      setCourts(prev => [...prev, newCourt]);
      return newCourt;
    }

    const { data, error } = await supabase
      .from('courts')
      .insert(court)
      .select()
      .single();

    if (error) throw error;
    setCourts(prev => [...prev, data]);
    return data;
  }

  async function updateCourt(id, updates) {
    if (!supabase) {
      setCourts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      return;
    }

    const { data, error } = await supabase
      .from('courts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setCourts(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }

  async function deleteCourt(id) {
    if (!supabase) {
      setCourts(prev => prev.filter(c => c.id !== id));
      return;
    }

    const { error } = await supabase
      .from('courts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setCourts(prev => prev.filter(c => c.id !== id));
  }

  return { courts, loading, addCourt, updateCourt, deleteCourt, refetch: fetchCourts };
}
