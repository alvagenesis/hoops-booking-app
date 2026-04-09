import { Clock } from 'lucide-react';

const TimeSlotSelection = ({ slots, selectedSlots = [], onSelect, bookedSlots = [], hourlyRate, selectedDate }) => {

    function handleSlotClick(slot) {
        // Clicking any already-selected slot → deselect all
        if (selectedSlots.some(s => s.start === slot.start)) {
            onSelect([]);
            return;
        }
        if (selectedSlots.length === 0) {
            onSelect([slot]);
            return;
        }
        // Build contiguous range from anchor (first selected) to clicked slot
        const anchorIdx = slots.findIndex(s => s.start === selectedSlots[0].start);
        const clickedIdx = slots.findIndex(s => s.start === slot.start);
        const [from, to] = anchorIdx <= clickedIdx ? [anchorIdx, clickedIdx] : [clickedIdx, anchorIdx];
        const range = slots.slice(from, to + 1);
        // Block if any slot in the range overlaps a booked/blocked entry
        const hasConflict = range.some(s =>
            bookedSlots.find(b => {
                const bStart = toMinutes(b.start_time);
                const bEnd   = toMinutes(b.end_time);
                const sStart = toMinutes(s.start);
                const sEnd   = toMinutes(s.end);
                return bStart < sEnd && bEnd > sStart;
            })
        );
        if (hasConflict) return;
        onSelect(range);
    }

    // Format HH:MM → h:mm AM/PM
    function formatTime(t) {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    const hasSelection = selectedSlots.length > 0;
    const totalHours = hasSelection
        ? (() => {
            const [startH, startM = 0] = selectedSlots[0].start.split(':').map(Number);
            const [endH, endM = 0] = selectedSlots[selectedSlots.length - 1].end.split(':').map(Number);
            return (endH * 60 + endM - startH * 60 - startM) / 60;
        })()
        : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-1">Select Time Slot</h3>
                    <p className="text-sm text-gray-500">Click a slot to start. Click another to extend the range.</p>
                </div>
                {hourlyRate != null && (
                    <span className="text-sm font-semibold text-gray-300 bg-[#16161c] border border-gray-800 rounded-lg px-3 py-1.5 whitespace-nowrap">
                        ₱{hourlyRate.toLocaleString()}<span className="text-gray-500 font-normal">/hr</span>
                    </span>
                )}
            </div>

            {slots.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No time slots available for the selected date(s).
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                        // A slot is unavailable if any booked/blocked entry overlaps it
                        // (not just exact match — a block covering 08:00–17:00 should disable all slots within)
                        const matchingEntry = bookedSlots.find(b => {
                            const bStart = toMinutes(b.start_time);
                            const bEnd   = toMinutes(b.end_time);
                            const sStart = toMinutes(slot.start);
                            const sEnd   = toMinutes(slot.end);
                            return bStart < sEnd && bEnd > sStart; // overlap
                        });
                        const isBlocked = matchingEntry?.source === 'block';
                        const isBooked = Boolean(matchingEntry) && !isBlocked;
                        const isNow = isSlotTooSoon(slot.start, selectedDate);
                        const isSelected = selectedSlots.some(s => s.start === slot.start && s.end === slot.end);
                        const isDisabled = isBooked || isBlocked || isNow;

                        return (
                            <button
                                key={slot.start}
                                data-testid={`slot-${slot.start}`}
                                onClick={() => !isDisabled && handleSlotClick(slot)}
                                disabled={isDisabled}
                                className={`px-3 py-3 rounded-lg text-sm font-medium transition-all border ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/30'
                                        : isBlocked
                                            ? 'border-gray-800 bg-slate-500/10 text-gray-500 cursor-not-allowed'
                                            : isBooked
                                                ? 'border-gray-800 bg-red-500/5 text-gray-600 cursor-not-allowed'
                                                : isNow
                                                    ? 'border-gray-800 bg-yellow-500/5 text-gray-600 cursor-not-allowed'
                                                    : 'border-gray-800 bg-[#111116] text-gray-300 hover:border-gray-700 hover:bg-[#16161c]'
                                }`}
                            >
                                <span className="block">{slot.label}</span>
                                {isBlocked && <span className="block text-xs text-slate-400 mt-0.5">Blocked</span>}
                                {isBooked && !isBlocked && <span className="block text-xs text-red-400 mt-0.5">Booked</span>}
                                {isNow && !isBooked && !isBlocked && <span className="block text-xs text-yellow-500 mt-0.5">Too soon</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {hasSelection && (
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-blue-300 font-medium">
                        {formatTime(selectedSlots[0].start)} – {formatTime(selectedSlots[selectedSlots.length - 1].end)}
                    </span>
                    <span className="text-sm text-blue-400 font-semibold">
                        {totalHours}h {totalHours > 1 ? 'total' : ''}
                        {hourlyRate != null && (
                            <span className="text-blue-300 font-normal ml-1">
                                · ₱{(hourlyRate * totalHours).toLocaleString()}
                            </span>
                        )}
                    </span>
                </div>
            )}
        </div>
    );
};

function toMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function isSlotTooSoon(startTime, selectedDate) {
    const now = new Date();
    const slotDate = selectedDate ? new Date(selectedDate) : new Date();
    const [h, m] = startTime.split(':').map(Number);
    slotDate.setHours(h, m, 0, 0);
    const isToday = slotDate.toDateString() === now.toDateString();
    return isToday && slotDate.getTime() - now.getTime() < 60 * 60 * 1000;
}

export default TimeSlotSelection;
