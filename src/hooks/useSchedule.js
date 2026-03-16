import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSchedule(courtId) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConfigs = useCallback(async () => {
        if (!courtId) return;
        setLoading(true);

        if (!supabase) {
            // Mock default configs for all 7 days if no supabase
            const mockConfigs = Array.from({ length: 7 }, (_, i) => ({
                id: `mock-${i}`,
                court_id: courtId,
                day_of_week: i,
                start_time: '06:00',
                end_time: '22:00',
                slot_duration_minutes: 60,
                is_active: true
            }));
            setConfigs(mockConfigs);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('time_slot_configs')
            .select('*')
            .eq('court_id', courtId)
            .order('day_of_week');

        if (!error && data) {
            setConfigs(data);
        }
        setLoading(false);
    }, [courtId]);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    async function updateConfig(id, updates) {
        if (!supabase) {
            setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            return;
        }

        const { data, error } = await supabase
            .from('time_slot_configs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        setConfigs(prev => prev.map(c => c.id === id ? data : c));
        return data;
    }

    async function bulkUpdateSlots(updates) {
        // updates is expected to be an array of objects with { id, ...fields }
        if (!supabase) {
            setConfigs(prev => prev.map(c => {
                const u = updates.find(update => update.id === c.id);
                return u ? { ...c, ...u } : c;
            }));
            return;
        }

        const promises = updates.map(u =>
            supabase.from('time_slot_configs').update(u).eq('id', u.id)
        );

        await Promise.all(promises);
        await fetchConfigs();
    }

    return { configs, loading, updateConfig, bulkUpdateSlots, refetch: fetchConfigs };
}
