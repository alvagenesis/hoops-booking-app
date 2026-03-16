import { CalendarIcon, MapPin, X, User, Clock, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import ModalOverlay from '../components/ui/ModalOverlay';
import { formatDate } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

const ReservationDetailModal = ({ reservation, onClose, onCancel }) => {
    const { role, user } = useAuth();
    const isAdmin = role === 'admin';
    const isOwner = user?.id === reservation.user_id;

    const start = reservation.start_date ? new Date(reservation.start_date) : reservation.start;
    const end = reservation.end_date ? new Date(reservation.end_date) : reservation.end;
    const court = reservation.courts;

    return (
        <ModalOverlay onClose={onClose}>
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#16161c] rounded-t-2xl">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-400" /> Reservation Details
                </h3>
                <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-2xl font-bold text-gray-100">{reservation.title || 'Court Booking'}</h4>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${reservation.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                                }`}>
                                {reservation.status}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{reservation.payment_status || 'Pending'} Payment</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-3 bg-[#1a1a24] rounded-xl border border-gray-800/50">
                            <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500">Date & Duration</p>
                                <p className="text-sm text-gray-200 mt-0.5">
                                    {formatDate(start)}
                                    {start.getTime() !== end.getTime() && ` — ${formatDate(end)}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-[#1a1a24] rounded-xl border border-gray-800/50">
                            <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500">Court Facility</p>
                                <p className="text-sm text-gray-200 mt-0.5">{court?.name || 'Main Court'}</p>
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                            <User className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <p className="text-xs text-blue-400/70 font-medium">Customer Information (Admin Only)</p>
                                <p className="text-sm text-gray-200 mt-0.5">User ID: {reservation.user_id.slice(0, 8)}...</p>
                                <p className="text-xs text-gray-500 mt-0.5">Click to view profile (coming soon)</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-[#0d0d10] border border-gray-800/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Charged</span>
                        <span className="text-gray-200">₱{reservation.total_amount?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Paid Amount</span>
                        <span className="text-green-500">₱{reservation.paid_amount?.toLocaleString() || '0'}</span>
                    </div>
                </div>

                <div className="flex justify-between gap-3 pt-2">
                    {(isAdmin || isOwner) && reservation.status !== 'cancelled' && (
                        <Button
                            variant="secondary"
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 gap-2"
                            onClick={() => onCancel(reservation.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                            {isAdmin ? 'Cancel Reservation (Admin)' : 'Cancel My Booking'}
                        </Button>
                    )}
                    <div className="flex-1"></div>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </ModalOverlay>
    );
};

export default ReservationDetailModal;
