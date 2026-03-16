import { Clock } from 'lucide-react';

const TimeSlotSelection = ({ slots, selectedSlot, onSelect, bookedSlots = [] }) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-1">Select Time Slot</h3>
                <p className="text-sm text-gray-500">Choose an available time slot</p>
            </div>

            {slots.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No time slots available for the selected date(s).
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                        const isBooked = bookedSlots.some(
                            b => b.start_time === slot.start && b.end_time === slot.end
                        );
                        const isNow = isSlotTooSoon(slot.start);
                        const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                        const isDisabled = isBooked || isNow;

                        return (
                            <button
                                key={slot.start}
                                data-testid={`slot-${slot.start}`}
                                onClick={() => !isDisabled && onSelect(slot)}
                                disabled={isDisabled}
                                className={`px-3 py-3 rounded-lg text-sm font-medium transition-all border ${isSelected
                                    ? 'border-blue-500 bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/30'
                                    : isBooked
                                        ? 'border-gray-800 bg-red-500/5 text-gray-600 cursor-not-allowed'
                                        : isNow
                                            ? 'border-gray-800 bg-yellow-500/5 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-800 bg-[#111116] text-gray-300 hover:border-gray-700 hover:bg-[#16161c]'
                                    }`}
                            >
                                <span className="block">{slot.label}</span>
                                {isBooked && <span className="block text-xs text-red-400 mt-0.5">Booked</span>}
                                {isNow && !isBooked && <span className="block text-xs text-yellow-500 mt-0.5">Too soon</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

function isSlotTooSoon(startTime) {
    const now = new Date();
    const today = new Date();
    const [h, m] = startTime.split(':').map(Number);
    today.setHours(h, m, 0, 0);
    // Too soon if within 1 hour from now
    return today.getTime() - now.getTime() < 60 * 60 * 1000 && today.getDate() === now.getDate();
}

export default TimeSlotSelection;
