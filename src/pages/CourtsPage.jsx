import { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Loader2, Check, X, Shield } from 'lucide-react';
import { useCourts } from '../hooks/useCourts';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const CourtsPage = () => {
    const { courts, loading, addCourt, updateCourt, deleteCourt } = useCourts();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6', hourly_rate: 0 });
    const [submitting, setSubmitting] = useState(false);

    const handleEdit = (court) => {
        setEditingId(court.id);
        setFormData({
            name: court.name,
            description: court.description || '',
            color: court.color || '#3B82F6',
            hourly_rate: court.hourly_rate || 0
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await updateCourt(editingId, formData);
                setEditingId(null);
            } else {
                await addCourt({ ...formData, sort_order: courts.length + 1 });
                setIsAdding(false);
            }
            setFormData({ name: '', description: '', color: '#3B82F6', hourly_rate: 0 });
        } catch (err) {
            console.error('Save error:', err);
        }
        setSubmitting(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this court? All associated bookings might be affected.')) return;
        try {
            await deleteCourt(id);
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-100">Court Management</h2>
                        <p className="text-sm text-gray-500">Add or modify facility courts</p>
                    </div>
                </div>
                {!isAdding && !editingId && (
                    <Button onClick={() => setIsAdding(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Add Court
                    </Button>
                )}
            </div>

            {(isAdding || editingId) && (
                <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold text-gray-100 mb-6">
                        {editingId ? 'Edit Court' : 'Add New Court'}
                    </h3>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Court Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Center Court"
                                required
                            />
                            <Input
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Short description..."
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Hourly Rate (₱)"
                                    type="number"
                                    value={formData.hourly_rate}
                                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                                    required
                                />
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-400">Color</label>
                                    <div className="flex gap-2 items-center h-10 border border-gray-800 rounded-md px-3 bg-[#0a0a0c]">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-400 font-mono uppercase">{formData.color}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Court'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map(court => (
                    <div key={court.id} className="bg-[#111116] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 bg-gray-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>

                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: court.color || '#3B82F6' }}></div>
                                <h4 className="font-semibold text-gray-100">{court.name}</h4>
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(court)} className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(court.id)} className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[40px]">
                            {court.description || 'No description provided.'}
                        </p>

                        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm">
                            <span className="text-gray-400 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> Rate
                            </span>
                            <span className="font-bold text-gray-200">₱{parseFloat(court.hourly_rate || 0).toLocaleString()}/hr</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourtsPage;
