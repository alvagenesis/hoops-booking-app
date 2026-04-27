import { useState } from 'react';
import { Package, Plus, Edit2, Loader2, Check, X, Monitor, Wind, Thermometer, Lamp, Projector, Droplets, Star } from 'lucide-react';

const ICON_MAP = {
  monitor: Monitor,
  wind: Wind,
  thermometer: Thermometer,
  lamp: Lamp,
  projector: Projector,
  droplets: Droplets,
  star: Star,
};

function AmenityIcon({ name, className }) {
  const Icon = ICON_MAP[name] || Star;
  return <Icon className={className} />;
}
import { useAmenities } from '../hooks/useAmenities';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const EMPTY_FORM = { name: '', description: '', price: 0, icon: 'star', sort_order: 0 };

const AmenitiesPage = () => {
    const { amenities, loading, addAmenity, updateAmenity } = useAmenities();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [pageError, setPageError] = useState('');

    const handleEdit = (amenity) => {
        setEditingId(amenity.id);
        setFormData({
            name: amenity.name,
            description: amenity.description || '',
            price: amenity.price,
            icon: amenity.icon || 'star',
            sort_order: amenity.sort_order || 0,
        });
        setIsAdding(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = { ...formData, price: parseFloat(formData.price) || 0, sort_order: parseInt(formData.sort_order) || 0 };
            if (editingId) {
                await updateAmenity(editingId, payload);
                setEditingId(null);
            } else {
                await addAmenity({ ...payload, is_active: true });
                setIsAdding(false);
            }
            setFormData(EMPTY_FORM);
        } catch (err) {
            console.error('Save error:', err);
        }
        setSubmitting(false);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
    };

    const handleToggleActive = async (amenity) => {
        setPageError('');
        try {
            await updateAmenity(amenity.id, { is_active: !amenity.is_active });
        } catch (err) {
            setPageError(`Failed to update amenity: ${err.message}`);
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
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-100">Amenities</h2>
                        <p className="text-sm text-gray-500">Manage optional add-ons available during booking</p>
                    </div>
                </div>
                {!isAdding && !editingId && (
                    <Button onClick={() => setIsAdding(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Add Amenity
                    </Button>
                )}
            </div>

            {(isAdding || editingId) && (
                <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold text-gray-100 mb-6">
                        {editingId ? 'Edit Amenity' : 'Add New Amenity'}
                    </h3>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Scoreboard"
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
                                    label="Price (₱)"
                                    type="number"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Sort Order"
                                    type="number"
                                    min="0"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                                />
                            </div>
                            <Input
                                label="Icon (lucide name)"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="e.g. monitor, wind, thermometer"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save Amenity</>}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {pageError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between gap-3">
                    <p className="text-red-400 text-sm">{pageError}</p>
                    <button onClick={() => setPageError('')} className="text-red-400 hover:text-red-300 text-sm shrink-0">Dismiss</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {amenities.map(amenity => (
                    <div
                        key={amenity.id}
                        className={`bg-[#111116] border rounded-2xl p-5 transition-all group relative ${
                            amenity.is_active ? 'border-gray-800 hover:border-gray-700' : 'border-gray-800/40 opacity-50'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-100 truncate">{amenity.name}</h4>
                                    {!amenity.is_active && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-500">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
                                    {amenity.description || 'No description.'}
                                </p>
                            </div>
                            <div className="flex gap-1 ml-2 shrink-0">
                                <button
                                    onClick={() => handleEdit(amenity)}
                                    className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleToggleActive(amenity)}
                                    className={`group/toggle p-1.5 rounded-md transition-colors ${
                                        amenity.is_active
                                            ? 'text-green-400 hover:bg-red-500/10 hover:text-red-400'
                                            : 'text-gray-600 hover:bg-green-500/10 hover:text-green-400'
                                    }`}
                                    title={amenity.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {amenity.is_active ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 group-hover/toggle:hidden" />
                                            <X className="w-3.5 h-3.5 hidden group-hover/toggle:block" />
                                        </>
                                    ) : (
                                        <>
                                            <X className="w-3.5 h-3.5 group-hover/toggle:hidden" />
                                            <Check className="w-3.5 h-3.5 hidden group-hover/toggle:block" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm">
                            <AmenityIcon name={amenity.icon} className="w-4 h-4 text-gray-500" />
                            <span className="font-bold text-gray-200">₱{parseFloat(amenity.price || 0).toLocaleString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            {amenities.length === 0 && (
                <div className="text-center py-16 text-gray-600">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No amenities yet. Add your first one above.</p>
                </div>
            )}
        </div>
    );
};

export default AmenitiesPage;
