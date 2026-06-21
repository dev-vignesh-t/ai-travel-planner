import { useState } from 'react';
import api from '../../utils/api';

const CATEGORY_LABELS = {
  Documents: '📄 Documents',
  Clothing: '👕 Clothing',
  Gear: '🎒 Gear',
  Other: '🧴 Other'
};

const PackingList = ({ trip, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  if (!trip?.packingList?.length) return null;

  const togglePackingItem = async (itemId) => {
    setUpdating(true);
    const updatedPackingList = trip.packingList.map((item) =>
      item._id === itemId ? { ...item, isPacked: !item.isPacked } : item
    );

    try {
      const res = await api.put(`/api/trips/${trip._id}`, { packingList: updatedPackingList });
      onUpdate(res.data);
    } catch (err) {
      console.error('Failed to update packing list', err);
    } finally {
      setUpdating(false);
    }
  };

  const groupedByCategory = trip.packingList.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});

  const packedCount = trip.packingList.filter((item) => item.isPacked).length;
  const totalCount = trip.packingList.length;

  return (
    <div className="bg-white p-5 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-lg font-bold text-slate-800">🎒 AI Weather-Aware Packing Assistant</h3>
        <span className="text-xs font-semibold text-indigo-600">{packedCount}/{totalCount} packed</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Based on {trip.destination}'s climate and your planned activities.
      </p>

      <div className="space-y-4">
        {Object.entries(groupedByCategory).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-slate-600 mb-2">
              {CATEGORY_LABELS[category] || category}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((item) => (
                <label
                  key={item._id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                    item.isPacked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.isPacked}
                    onChange={() => togglePackingItem(item._id)}
                    disabled={updating}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span className={`text-sm ${item.isPacked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PackingList;