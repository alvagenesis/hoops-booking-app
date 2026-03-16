import { useState } from 'react';
import { CalendarIcon, MapPin, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ModalOverlay from '../components/ui/ModalOverlay';
import { formatDate } from '../lib/utils';

const BookingModal = ({ courts, reservations, onClose, selectedDates, initialData, onProceed }) => {
  const [courtId, setCourtId] = useState(initialData?.courtId || courts[0]?.id || '');
  const [title, setTitle] = useState(initialData?.title || '');

  const start = initialData?.start || selectedDates?.start || new Date();
  const end = initialData?.end || selectedDates?.end || start;

  const selectedCourt = courts.find(c => c.id === courtId);

  // Check for conflicts
  const hasConflict = reservations?.some(res => {
    if (res.status === 'cancelled') return false;
    if (res.court_id !== courtId) return false;

    const resStart = res.start_date ? new Date(res.start_date) : new Date(res.start);
    const resEnd = res.end_date ? new Date(res.end_date) : new Date(res.end);

    // Overlap check
    return (start <= resEnd && end >= resStart);
  });

  // Calculate duration in days (minimum 1)
  const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const totalAmount = selectedCourt ? days * selectedCourt.pricePerDay : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    onProceed({
      courtId,
      title,
      start,
      end,
      totalAmount,
    });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#16161c] rounded-t-2xl">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-400" /> New Booking
        </h3>
        <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <Input
          label="Booking Title"
          placeholder="e.g., Weekend Tournament"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Court</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full bg-[#14141a] border border-gray-800 rounded-md py-2 pl-9 pr-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
            >
              {courts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — ₱{c.pricePerDay}/day
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Start Date</label>
            <div className="bg-[#14141a] border border-gray-800 rounded-md py-2 px-3 text-sm text-gray-300">
              {formatDate(start)}
            </div>
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-medium text-gray-400">End Date</label>
            <div className="bg-[#14141a] border border-gray-800 rounded-md py-2 px-3 text-sm text-gray-300">
              {formatDate(end)}
            </div>
          </div>
        </div>

        {hasConflict && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <div className="p-1 bg-red-500/20 rounded text-red-400 mt-0.5">
              <X className="w-3 h-3" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-400">Date Conflict</p>
              <p className="text-xs text-red-500/80 mt-0.5">This court is already reserved for the selected dates. Please choose another court or different dates.</p>
            </div>
          </div>
        )}

        <div className="bg-[#1a1a24] border border-gray-800 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{selectedCourt?.name}</span>
            <span className="text-gray-400">₱{selectedCourt?.pricePerDay}/day × {days} day{days > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-gray-700">
            <span className="text-sm font-medium text-gray-200">Total</span>
            <span className="text-lg font-bold text-blue-400">₱{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!title.trim() || hasConflict}>
            Proceed to Payment
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
};

export default BookingModal;
