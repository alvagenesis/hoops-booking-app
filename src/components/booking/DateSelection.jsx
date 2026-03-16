import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

const DateSelection = ({ selectedDates, onSelect }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-1">Select Date(s)</h3>
                <p className="text-sm text-gray-500">Pick a single date or a range of dates</p>
            </div>

            <div className="flex justify-center overflow-x-auto">
                <div className="rdp-dark">
                    <DayPicker
                        mode="range"
                        selected={selectedDates}
                        onSelect={onSelect}
                        numberOfMonths={isMobile ? 1 : 2}
                        disabled={{ before: today }}
                        showOutsideDays
                        classNames={{
                            root: 'text-gray-100',
                            months: 'flex flex-col md:flex-row gap-4 md:gap-8',
                            month_caption: 'text-sm font-semibold text-gray-200 mb-2 px-2',
                            weekday: 'text-xs text-gray-500 font-medium',
                            day_button: 'w-9 h-9 text-sm rounded-lg transition-colors',
                            today: 'font-bold text-blue-400',
                            selected: 'bg-blue-600 text-white',
                            range_start: 'bg-blue-600 text-white rounded-l-lg',
                            range_end: 'bg-blue-600 text-white rounded-r-lg',
                            range_middle: 'bg-blue-500/20 text-blue-300',
                            disabled: 'text-gray-700/40 opacity-30 cursor-not-allowed pointer-events-none line-through',
                            outside: 'text-gray-700/40 opacity-30',
                        }}
                    />
                </div>
            </div>

            {selectedDates?.from && (
                <div className="bg-[#16161c] border border-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-300">
                        <span className="text-gray-500">Selected: </span>
                        {selectedDates.from.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {selectedDates.to && selectedDates.to.getTime() !== selectedDates.from.getTime() && (
                            <> → {selectedDates.to.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
};

export default DateSelection;
