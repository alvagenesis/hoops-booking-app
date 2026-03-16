import { MapPin } from 'lucide-react';

const CourtSelection = ({ courts, selectedCourt, onSelect }) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-1">Select a Court</h3>
                <p className="text-sm text-gray-500">Choose the court you want to book</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courts.map((court) => (
                    <button
                        key={court.id}
                        onClick={() => onSelect(court)}
                        className={`relative text-left p-5 rounded-xl border transition-all duration-200 group ${selectedCourt?.id === court.id
                                ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30'
                                : 'border-gray-800 bg-[#111116] hover:border-gray-700 hover:bg-[#16161c]'
                            }`}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ backgroundColor: court.color }} />
                        <div className="flex items-start justify-between mt-1">
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-100 group-hover:text-white transition-colors">
                                    {court.name}
                                </h4>
                                {court.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{court.description}</p>
                                )}
                            </div>
                            <div className="ml-3 flex items-center gap-1 text-gray-400">
                                <MapPin className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-100">₱{court.hourly_rate}</span>
                            <span className="text-xs text-gray-500">/hour</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CourtSelection;
