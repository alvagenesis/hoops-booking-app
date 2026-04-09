import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_TIME_SLOT_CONFIGS, MOCK_SCHEDULE_BLOCKS } from '../lib/constants';
import { formatLocalDate } from '../lib/utils';

export function useTimeSlots(courtId) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scheduleBlocks, setScheduleBlocks] = useState([]);

    useEffect(() => {
        async function fetchConfigs() {
            if (!courtId) { setConfigs([]); setLoading(false); return; }

            if (!supabase) {
                setConfigs(MOCK_TIME_SLOT_CONFIGS.filter(c => c.court_id === courtId));
                setScheduleBlocks(MOCK_SCHEDULE_BLOCKS.filter(b => b.court_id === courtId));
                setLoading(false);
                return;
            }

            const [{ data, error }, { data: blockData, error: blockError }] = await Promise.all([
                supabase
                    .from('time_slot_configs')
                    .select('*')
                    .eq('court_id', courtId)
                    .eq('is_active', true)
                    .order('day_of_week'),
                supabase
                    .from('schedule_blocks')
                    .select('*')
                    .eq('court_id', courtId)
                    .order('date'),
            ]);

            if (!error && data) {
                setConfigs(data);
            } else {
                setConfigs(MOCK_TIME_SLOT_CONFIGS.filter(c => c.court_id === courtId));
            }

            if (!blockError && blockData) {
                setScheduleBlocks(blockData);
            } else {
                setScheduleBlocks([]);
            }
            setLoading(false);
        }
        fetchConfigs();
    }, [courtId]);

    // Generate time slot strings for a specific day of week
    const getSlotsForDay = useCallback((dayOfWeek) => {
        const config = configs.find(c => c.day_of_week === dayOfWeek);
        if (!config) return [];

        const slots = [];
        const [startH, startM] = config.start_time.split(':').map(Number);
        const [endH, endM] = config.end_time.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const duration = config.slot_duration_minutes;

        for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
            const fromH = Math.floor(m / 60);
            const fromM = m % 60;
            const toH = Math.floor((m + duration) / 60);
            const toM = (m + duration) % 60;
            const from = `${String(fromH).padStart(2, '0')}:${String(fromM).padStart(2, '0')}`;
            const to = `${String(toH).padStart(2, '0')}:${String(toM).padStart(2, '0')}`;
            slots.push({ start: from, end: to, label: `${formatTime(from)} – ${formatTime(to)}` });
        }
        return slots;
    }, [configs]);

    // Fetch reservations and schedule blocks for a specific date to identify unavailable slots
    const getBookedSlotsForDay = useCallback(async (date) => {
        if (!courtId || !date) return [];

        const dateStr = formatLocalDate(date);

        if (!supabase) {
            return MOCK_SCHEDULE_BLOCKS
                .filter(b => b.court_id === courtId && b.date === dateStr)
                .map(b => ({ start_time: b.start_time, end_time: b.end_time, source: 'block', reason: b.reason }));
        }

        const { data: reservationsData } = await supabase
            .from('reservations')
            .select('id, start_time, end_time, status')
            .eq('court_id', courtId)
            .not('status', 'in', '(cancelled,no_show)')
            .order('start_time');

        const { data: dayData, error: dayError } = await supabase
            .from('reservation_days')
            .select('reservation_id')
            .eq('date', dateStr);

        const { data: blockData } = await supabase
            .from('schedule_blocks')
            .select('start_time, end_time, reason, block_type')
            .eq('court_id', courtId)
            .eq('date', dateStr)
            .order('start_time');


        if (dayError || !dayData) return blockData || [];

        const resIds = dayData.map(d => d.reservation_id);
        const dayReservations = (reservationsData || [])
            .filter(r => resIds.includes(r.id))
            .map(r => ({ ...r, source: 'reservation' }));

        const dayBlocks = (blockData || []).map(block => ({ ...block, source: 'block' }));

        return [...dayReservations, ...dayBlocks];
    }, [courtId]);

    return { configs, loading, scheduleBlocks, getSlotsForDay, getBookedSlotsForDay };
}

function formatTime(time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
