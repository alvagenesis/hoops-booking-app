import { useState } from 'react';
import { Sparkles, X, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import ModalOverlay from '../components/ui/ModalOverlay';
import { callGeminiAPI } from '../lib/gemini';

const AIBookingModal = ({ courts, onClose, onSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedResults, setParsedResults] = useState(null);

  const handleAISubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const today = new Date();
      const systemPrompt = `You are a professional assistant for the "YMCA", a basketball court booking system.
      Current Date Context: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${today.toISOString()}).
      Available Courts: ${JSON.stringify(courts.map(c => ({ id: c.id, name: c.name })))}.

      Task: Parse the user's booking request into structured JSON.
      Rules:
      1. Map the court name mentioned to the closest Available Court ID.
      2. Dates must be absolute (Year, Month 1-12, Day). 
      3. If the user says "next week", calculate based on the Current Date Context.
      4. If user says "this weekend", find the upcoming Saturday/Sunday.
      5. "Start" and "End" dates can be the same for single-day bookings.
      6. Provide a friendly descriptive "title" for the booking (e.g., "Saturday Scrimmage").

      User Request: "${prompt}"`;

      const result = await callGeminiAPI(systemPrompt, true);

      if (!result.courtId || !result.startYear) {
        throw new Error("Missing essential booking details.");
      }

      const verificationData = {
        title: result.title || 'Court Booking',
        courtId: result.courtId,
        courtName: courts.find(c => c.id === result.courtId)?.name || 'Unknown Court',
        start: new Date(result.startYear, result.startMonth - 1, result.startDay),
        end: new Date(result.endYear, result.endMonth - 1, result.endDay)
      };

      setParsedResults(verificationData);
    } catch (err) {
      console.error('AI Processing Error:', err);
      setError('I couldn\'t quite get that. Try being specific, e.g., "Book Main Indoor for next Friday".');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onSuccess(parsedResults);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gradient-to-r from-blue-900/20 to-transparent rounded-t-2xl">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" /> Smart Assistant
        </h3>
        <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      {!parsedResults ? (
        <form onSubmit={handleAISubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Tell me what to book</label>
            <textarea
              className="w-full bg-[#14141a] border border-gray-800 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 min-h-[100px] resize-none"
              placeholder="e.g., 'Book the outdoor street court for a weekend tournament next week from the 14th to 15th.'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !prompt.trim()} className="min-w-[120px]">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze Request'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-6 space-y-6">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-4">
            <p className="text-sm font-medium text-gray-300 uppercase tracking-wider">Here is what I found:</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Booking Title</p>
                <p className="text-sm font-semibold text-gray-100">{parsedResults.title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Court</p>
                <p className="text-sm font-semibold text-gray-100">{parsedResults.courtName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-semibold text-gray-100">{parsedResults.start.toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm font-semibold text-gray-100">{parsedResults.end.toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center italic">
            Clicking confirm will pre-fill the booking form for you.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setParsedResults(null)}>Back</Button>
            <Button onClick={handleConfirm} className="min-w-[120px]">Confirm & Continue</Button>
          </div>
        </div>
      )}
    </ModalOverlay>
  );
};

export default AIBookingModal;
