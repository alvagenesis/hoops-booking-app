import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_TIME_SLOT_CONFIGS } from '../lib/constants';

export function useTimeSlots(courtId) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchConfigs() {
            if (!courtId) { setConfigs([]); setLoading(false); return; }

            if (!supabase) {
                setConfigs(MOCK_TIME_SLOT_CONFIGS.filter(c => c.court_id === courtId));
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('time_slot_configs')
                .select('*')
                .eq('court_id', courtId)
                .eq('is_active', true)
                .order('day_of_week');

            if (!error && data) {
                setConfigs(data);
            } else {
                setConfigs(MOCK_TIME_SLOT_CONFIGS.filter(c => c.court_id === courtId));
            }
            setLoading(false);
        }
        fetchConfigs();
    }, [courtId]);

    // Generate time slot strings for a specific day of week
    function getSlotsForDay(dayOfWeek) {
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
    }

    // Fetch reservations for a specific date to identify booked slots
    async function getBookedSlotsForDay(date) {
        if (!courtId || !date) return [];

        const dateStr = date.toISOString().split('T')[0];

        if (!supabase) {
            return []; // Simplified for mock
        }

        const { data, error } = await supabase
            .from('reservations')
            .select('start_time, end_time')
            .eq('court_id', courtId)
            .neq('status', 'cancelled')
            .order('start_time');

        // We also need to check reservation_days to match the exact date
        const { data: dayData, error: dayError } = await supabase
            .from('reservation_days')
            .select('reservation_id')
            .eq('date', dateStr);

        if (dayError || !dayData) return [];

        const resIds = dayData.map(d => d.reservation_id);

        // Filter reservations to only those on this day
        const dayReservations = data?.filter(r => resIds.includes(r.id)) || [];

        return dayReservations;
    }

    return { configs, loading, getSlotsForDay, getBookedSlotsForDay };
}

function formatTime(time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
