import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Calendar as CalendarIcon, Settings2, ShieldCheck, Plus, Trash2, Ban } from 'lucide-react';
import { useCourts } from '../hooks/useCourts';
import { useSchedule } from '../hooks/useSchedule';
import Button from '../components/ui/Button';
import { DAYS_OF_WEEK } from '../lib/utils';

const EMPTY_BLOCK_FORM = {
    date: '',
    start_time: '08:00',
    end_time: '09:00',
    reason: '',
    block_type: 'manual_block',
};

const SchedulePage = () => {
    const { courts, loading: loadingCourts } = useCourts();
    const [selectedCourtId, setSelectedCourtId] = useState(null);
    const { configs, scheduleBlocks, loading: loadingSchedule, bulkUpdateSlots, addScheduleBlock, deleteScheduleBlock } = useSchedule(selectedCourtId);

    const [editingConfigs, setEditingConfigs] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [blockForm, setBlockForm] = useState(EMPTY_BLOCK_FORM);
    const [blockSubmitting, setBlockSubmitting] = useState(false);

    useEffect(() => {
        if (courts.length > 0 && !selectedCourtId) {
            setSelectedCourtId(courts[0].id);
        }
    }, [courts, selectedCourtId]);

    useEffect(() => {
        if (configs.length > 0) {
            setEditingConfigs(JSON.parse(JSON.stringify(configs)));
        }
    }, [configs]);

    const handleFieldChange = (dayIndex, field, value) => {
        const newConfigs = [...editingConfigs];
        newConfigs[dayIndex][field] = value;
        setEditingConfigs(newConfigs);
    };

    const handleToggleDay = (dayIndex) => {
        const newConfigs = [...editingConfigs];
        newConfigs[dayIndex].is_active = !newConfigs[dayIndex].is_active;
        setEditingConfigs(newConfigs);
    };

    const handleApplyToAll = () => {
        const source = editingConfigs[0];
        const newConfigs = editingConfigs.map((c, i) => i === 0 ? c : {
            ...c,
            start_time: source.start_time,
            end_time: source.end_time,
            slot_duration_minutes: source.slot_duration_minutes,
            is_active: source.is_active
        });
        setEditingConfigs(newConfigs);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSuccessMsg('');
        try {
            await bulkUpdateSlots(editingConfigs);
            setSuccessMsg('Schedule updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error('Save error:', err);
        }
        setIsSaving(false);
    };

    const handleAddBlock = async (e) => {
        e.preventDefault();
        if (!selectedCourtId) return;
        setBlockSubmitting(true);
        try {
            await addScheduleBlock({
                ...blockForm,
                court_id: selectedCourtId,
            });
            setBlockForm(EMPTY_BLOCK_FORM);
            setSuccessMsg('Schedule block added.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error('Block save error:', err);
        }
        setBlockSubmitting(false);
    };

    const handleDeleteBlock = async (id) => {
        try {
            await deleteScheduleBlock(id);
            setSuccessMsg('Schedule block removed.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error('Delete block error:', err);
        }
    };

    if (loadingCourts || (selectedCourtId && loadingSchedule && editingConfigs.length === 0)) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const selectedCourt = courts.find(c => c.id === selectedCourtId);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-100">Facility Scheduling</h2>
                        <p className="text-sm text-gray-500">Configure operating hours and block off unavailable slots</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-[#111116] p-1.5 rounded-xl border border-gray-800 overflow-x-auto flex-nowrap">
                    {courts.map(court => (
                        <button
                            key={court.id}
                            onClick={() => setSelectedCourtId(court.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCourtId === court.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                }`}
                        >
                            {court.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[#111116] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 sm:p-6 border-b border-gray-800 bg-[#16161c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCourt?.color }}></div>
                        <h3 className="font-semibold text-gray-100">{selectedCourt?.name} Weekly Schedule</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleApplyToAll} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-2">
                        Apply Monday to all days
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="px-6 py-4">Day</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Open Time</th>
                                <th className="px-6 py-4">Close Time</th>
                                <th className="px-6 py-4">Slot Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {editingConfigs.map((config, idx) => (
                                <tr key={config.id} className={`transition-colors ${config.is_active ? 'bg-transparent' : 'bg-gray-900/20 opacity-60'}`}>
                                    <td className="px-6 py-4 font-medium text-gray-300">
                                        {DAYS_OF_WEEK[config.day_of_week] || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleDay(idx)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${config.is_active ? 'bg-blue-600' : 'bg-gray-700'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.is_active ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="time"
                                            value={config.start_time.slice(0, 5)}
                                            disabled={!config.is_active}
                                            onChange={(e) => handleFieldChange(idx, 'start_time', e.target.value)}
                                            className="bg-[#0a0a0c] border border-gray-800 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="time"
                                            value={config.end_time.slice(0, 5)}
                                            disabled={!config.is_active}
                                            onChange={(e) => handleFieldChange(idx, 'end_time', e.target.value)}
                                            className="bg-[#0a0a0c] border border-gray-800 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={config.slot_duration_minutes}
                                            disabled={!config.is_active}
                                            onChange={(e) => handleFieldChange(idx, 'slot_duration_minutes', parseInt(e.target.value))}
                                            className="bg-[#0a0a0c] border border-gray-800 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                        >
                                            <option value={30}>30 min</option>
                                            <option value={60}>60 min</option>
                                            <option value={90}>90 min</option>
                                            <option value={120}>120 min</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 sm:p-6 border-t border-gray-800 bg-[#16161c]/50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <AlertCircle className="w-4 h-4" />
                        Changes affect generated booking slots. Use schedule blocks below for one-off closures and private events.
                    </div>
                    <div className="flex items-center gap-4">
                        {successMsg && <span className="text-sm text-green-400 animate-pulse">{successMsg}</span>}
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Schedule
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                            <Ban className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-100">Add Schedule Block</h3>
                            <p className="text-sm text-gray-500">Block a date and time for maintenance, private events, or manual closures.</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddBlock} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-400">Date</label>
                                <input
                                    type="date"
                                    value={blockForm.date}
                                    onChange={(e) => setBlockForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="mt-1 w-full bg-[#0a0a0c] border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400">Type</label>
                                <select
                                    value={blockForm.block_type}
                                    onChange={(e) => setBlockForm(prev => ({ ...prev, block_type: e.target.value }))}
                                    className="mt-1 w-full bg-[#0a0a0c] border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="manual_block">Manual Block</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="private_event">Private Event</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-400">Start Time</label>
                                <input
                                    type="time"
                                    value={blockForm.start_time}
                                    onChange={(e) => setBlockForm(prev => ({ ...prev, start_time: e.target.value }))}
                                    className="mt-1 w-full bg-[#0a0a0c] border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400">End Time</label>
                                <input
                                    type="time"
                                    value={blockForm.end_time}
                                    onChange={(e) => setBlockForm(prev => ({ ...prev, end_time: e.target.value }))}
                                    className="mt-1 w-full bg-[#0a0a0c] border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-400">Reason</label>
                            <textarea
                                value={blockForm.reason}
                                onChange={(e) => setBlockForm(prev => ({ ...prev, reason: e.target.value }))}
                                rows={3}
                                placeholder="Why is this slot unavailable?"
                                className="mt-1 w-full bg-[#0a0a0c] border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        <Button type="submit" disabled={blockSubmitting || !blockForm.date} className="gap-2">
                            {blockSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Block
                        </Button>
                    </form>
                </div>

                <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-100">Upcoming Blocks</h3>
                            <p className="text-sm text-gray-500">Review maintenance windows and private reservations that block customer booking.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {scheduleBlocks.length === 0 ? (
                            <div className="text-sm text-gray-500 bg-[#0d0d10] border border-gray-800 rounded-xl p-4">
                                No schedule blocks yet for this court.
                            </div>
                        ) : scheduleBlocks.map(block => (
                            <div key={block.id} className="bg-[#0d0d10] border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-100">{new Date(block.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-orange-500/10 text-orange-400">{block.block_type.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-1">{block.start_time} – {block.end_time}</p>
                                    {block.reason && <p className="text-xs text-gray-500 mt-1">{block.reason}</p>}
                                </div>
                                <button
                                    onClick={() => handleDeleteBlock(block.id)}
                                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                    title="Delete block"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 flex gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 h-fit">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-100 mb-1 text-sm">Dynamic Generation</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            The booking wizard automatically generates slots based on these window settings, existing reservations, and any one-off schedule blocks.
                        </p>
                    </div>
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 flex gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400 h-fit">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-100 mb-1 text-sm">Conflict Prevention</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            System prevents double-booking at the database level regardless of weekly schedule edits or manual blocks added here.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
