import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalLoading } from '../contexts/LoadingContext';

export function useSchedule(courtId) {
    const [configs, setConfigs] = useState([]);
    const [scheduleBlocks, setScheduleBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { track } = useGlobalLoading();

    const fetchConfigs = useCallback(async () => {
        if (!courtId) return;
        setLoading(true);

        if (!supabase) {
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
            setScheduleBlocks([]);
            setLoading(false);
            return;
        }

        await track(async () => {
            const [{ data, error }, { data: blockData, error: blockError }] = await Promise.all([
                supabase
                    .from('time_slot_configs')
                    .select('*')
                    .eq('court_id', courtId)
                    .order('day_of_week'),
                supabase
                    .from('schedule_blocks')
                    .select('*')
                    .eq('court_id', courtId)
                    .order('date', { ascending: true }),
            ]);

            if (!error && data) setConfigs(data);
            if (!blockError && blockData) setScheduleBlocks(blockData);
        });
        setLoading(false);
    }, [courtId, track]);

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
        if (!supabase) {
            setConfigs(prev => {
                // If configs already exist, update them; otherwise store the new defaults
                if (prev.length > 0) {
                    return prev.map(c => {
                        const u = updates.find(update => update.day_of_week === c.day_of_week);
                        return u ? { ...c, ...u } : c;
                    });
                }
                return updates.map(u => ({ id: crypto.randomUUID(), ...u }));
            });
            return;
        }

        // Upsert on (court_id, day_of_week) — works for both existing rows (update)
        // and new courts that have no configs yet (insert).
        const { error } = await supabase
            .from('time_slot_configs')
            .upsert(updates, { onConflict: 'court_id,day_of_week' });

        if (error) throw error;
        await fetchConfigs();
    }

    async function addScheduleBlock(block) {
        if (!supabase) {
            const mockBlock = { id: crypto.randomUUID(), ...block, created_at: new Date().toISOString() };
            setScheduleBlocks(prev => [mockBlock, ...prev]);
            return mockBlock;
        }

        const { data, error } = await supabase
            .from('schedule_blocks')
            .insert(block)
            .select()
            .single();

        if (error) throw error;
        setScheduleBlocks(prev => [data, ...prev]);
        return data;
    }

    async function deleteScheduleBlock(id) {
        if (!supabase) {
            setScheduleBlocks(prev => prev.filter(block => block.id !== id));
            return;
        }

        const { error } = await supabase
            .from('schedule_blocks')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setScheduleBlocks(prev => prev.filter(block => block.id !== id));
    }

    return { configs, scheduleBlocks, loading, updateConfig, bulkUpdateSlots, addScheduleBlock, deleteScheduleBlock, refetch: fetchConfigs };
}
