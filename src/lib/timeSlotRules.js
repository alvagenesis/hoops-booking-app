export function getSlotTimingState(startTime, selectedDate, now = new Date()) {
    const slotDate = selectedDate ? new Date(selectedDate) : new Date(now);
    const [h, m] = startTime.split(':').map(Number);
    slotDate.setHours(h, m, 0, 0);
    const isToday = slotDate.toDateString() === now.toDateString();

    if (!isToday) return 'available';

    const timeUntilStart = slotDate.getTime() - now.getTime();

    if (timeUntilStart < 0) return 'past';
    if (timeUntilStart < 30 * 60 * 1000) return 'too-soon';
    return 'available';
}
