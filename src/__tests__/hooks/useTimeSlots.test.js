import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTimeSlots } from '../../hooks/useTimeSlots';
import { supabase } from '../../lib/supabase';
import { MOCK_TIME_SLOT_CONFIGS } from '../../lib/constants';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => Promise.resolve({ data: null, error: null }))
                    }))
                }))
            }))
        }))
    }
}));

describe('useTimeSlots', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty configs and loading false if no courtId provided', async () => {
        const { result } = renderHook(() => useTimeSlots(null));
        expect(result.current.configs).toEqual([]);
        expect(result.current.loading).toBe(false);
    });

    it('fetches configs from supabase when courtId is provided', async () => {
        const mockData = [
            {
                court_id: 'c1',
                day_of_week: 1,
                start_time: '08:00',
                end_time: '10:00',
                slot_duration_minutes: 60,
                is_active: true
            }
        ];

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        });

        const { result } = renderHook(() => useTimeSlots('c1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.configs).toEqual(mockData);
    });

    it('falls back to mock data if supabase fetch fails', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
        });

        const { result } = renderHook(() => useTimeSlots('c1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        const expectedMock = MOCK_TIME_SLOT_CONFIGS.filter(c => c.court_id === 'c1');
        expect(result.current.configs).toEqual(expectedMock);
    });

    it('generates correct slots for a day using getSlotsForDay', async () => {
        const mockData = [
            {
                court_id: 'c1',
                day_of_week: 1, // Monday
                start_time: '08:00',
                end_time: '11:00',
                slot_duration_minutes: 60,
                is_active: true
            }
        ];

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        });

        const { result } = renderHook(() => useTimeSlots('c1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        const slots = result.current.getSlotsForDay(1);
        expect(slots).toHaveLength(3);
        expect(slots[0]).toEqual({ start: '08:00', end: '09:00', label: '8 AM – 9 AM' });
        expect(slots[1]).toEqual({ start: '09:00', end: '10:00', label: '9 AM – 10 AM' });
        expect(slots[2]).toEqual({ start: '10:00', end: '11:00', label: '10 AM – 11 AM' });
    });

    it('returns empty array if no config for the day', async () => {
        const { result } = renderHook(() => useTimeSlots('c1'));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.getSlotsForDay(6)).toEqual([]); // Saturday usually empty in mock if not defined
    });
});
