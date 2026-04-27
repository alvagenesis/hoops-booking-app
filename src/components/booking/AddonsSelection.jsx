import {
  Monitor, Wind, Thermometer, Lamp, Projector, Droplets,
  Star, Package, Check,
} from 'lucide-react';

const ICON_MAP = {
  monitor:     Monitor,
  wind:        Wind,
  thermometer: Thermometer,
  lamp:        Lamp,
  projector:   Projector,
  droplets:    Droplets,
  star:        Star,
  package:     Package,
};

const AddonsSelection = ({ amenities, selectedAddons, onChange }) => {
  const active = amenities.filter(a => a.is_active);

  const toggle = (amenity) => {
    const isSelected = selectedAddons.some(a => a.id === amenity.id);
    if (isSelected) {
      onChange(selectedAddons.filter(a => a.id !== amenity.id));
    } else {
      onChange([...selectedAddons, amenity]);
    }
  };

  if (!active.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-300">Add-ons <span className="text-gray-600">(optional)</span></p>
        <p className="text-xs text-gray-500 mt-0.5">Select extras to include with your booking</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {active.map(amenity => {
          const isSelected = selectedAddons.some(a => a.id === amenity.id);
          const Icon = ICON_MAP[amenity.icon] || Star;

          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => toggle(amenity)}
              className={`relative flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                  : 'bg-[#0d0d10] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}
              <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
              <span className="text-xs font-medium leading-tight">{amenity.name}</span>
              <span className={`text-xs font-bold ${isSelected ? 'text-blue-300' : 'text-gray-300'}`}>
                ₱{amenity.price.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AddonsSelection;
