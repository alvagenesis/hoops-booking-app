import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_AMENITIES } from '../lib/constants';
import { useGlobalLoading } from '../contexts/LoadingContext';

export function useAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { track } = useGlobalLoading();

  const fetchAmenities = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setAmenities(MOCK_AMENITIES);
      setLoading(false);
      return;
    }

    await track(async () => {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .order('sort_order');

      if (!error && data) {
        setAmenities(data);
      } else {
        setAmenities(MOCK_AMENITIES);
      }
    });
    setLoading(false);
  }, [track]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  async function addAmenity(amenity) {
    if (!supabase) {
      const newAmenity = { id: crypto.randomUUID(), ...amenity, created_at: new Date().toISOString() };
      setAmenities(prev => [...prev, newAmenity]);
      return newAmenity;
    }

    const { data, error } = await supabase
      .from('amenities')
      .insert(amenity)
      .select()
      .single();

    if (error) throw error;
    setAmenities(prev => [...prev, data]);
    return data;
  }

  async function updateAmenity(id, updates) {
    // Optimistic update — UI responds immediately regardless of Supabase outcome
    setAmenities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));

    if (!supabase) return;

    const { data, error } = await supabase
      .from('amenities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Revert to server state on failure
      await fetchAmenities();
      throw error;
    }
    setAmenities(prev => prev.map(a => a.id === id ? data : a));
    return data;
  }

  return { amenities, loading, addAmenity, updateAmenity, refetch: fetchAmenities };
}
