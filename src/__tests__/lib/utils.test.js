import { describe, it, expect } from 'vitest';
import { getDaysInMonth, getFirstDayOfMonth, formatDate, isSameDay, isDateInRange, DAYS_OF_WEEK } from '../../lib/utils';

describe('DAYS_OF_WEEK', () => {
  it('has 7 days', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
    expect(DAYS_OF_WEEK[0]).toBe('Sun');
    expect(DAYS_OF_WEEK[6]).toBe('Sat');
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2026, 1)).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2026, 3)).toBe(30);
  });
});

describe('getFirstDayOfMonth', () => {
  it('returns the correct day of the week', () => {
    // Feb 1, 2026 is a Sunday (0)
    expect(getFirstDayOfMonth(2026, 1)).toBe(0);
  });

  it('returns 0-6 range', () => {
    const day = getFirstDayOfMonth(2026, 0);
    expect(day).toBeGreaterThanOrEqual(0);
    expect(day).toBeLessThanOrEqual(6);
  });
});

describe('formatDate', () => {
  it('formats a date correctly', () => {
    const date = new Date(2026, 1, 15);
    const result = formatDate(date);
    expect(result).toContain('Feb');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });
});

describe('isSameDay', () => {
  it('returns true for the same day', () => {
    const d1 = new Date(2026, 1, 15, 10, 30);
    const d2 = new Date(2026, 1, 15, 18, 0);
    expect(isSameDay(d1, d2)).toBe(true);
  });

  it('returns false for different days', () => {
    const d1 = new Date(2026, 1, 15);
    const d2 = new Date(2026, 1, 16);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  it('returns false for different months', () => {
    const d1 = new Date(2026, 0, 15);
    const d2 = new Date(2026, 1, 15);
    expect(isSameDay(d1, d2)).toBe(false);
  });
});

describe('isDateInRange', () => {
  const start = new Date(2026, 1, 10);
  const end = new Date(2026, 1, 15);

  it('returns true for a date within range', () => {
    expect(isDateInRange(new Date(2026, 1, 12), start, end)).toBe(true);
  });

  it('returns true for start date', () => {
    expect(isDateInRange(new Date(2026, 1, 10), start, end)).toBe(true);
  });

  it('returns true for end date', () => {
    expect(isDateInRange(new Date(2026, 1, 15), start, end)).toBe(true);
  });

  it('returns false for a date before range', () => {
    expect(isDateInRange(new Date(2026, 1, 9), start, end)).toBe(false);
  });

  it('returns false for a date after range', () => {
    expect(isDateInRange(new Date(2026, 1, 16), start, end)).toBe(false);
  });
});
