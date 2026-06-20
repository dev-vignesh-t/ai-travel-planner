import { useState } from 'react';
import api from '../../utils/api';

const ItineraryDay = ({ day, trip, onUpdate }) => {
  const [newActivity, setNewActivity] = useState('');
  const [feedback, setFeedback] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const handleAddActivity = async () => {
    if (!newActivity.trim()) return;

    const updatedItinerary = trip.itinerary.map((d) =>
      d.dayNumber === day.dayNumber
        ? { ...d, activities: [...d.activities, { title: newActivity, description: 'Added by traveler', estimatedCostUSD: 0, timeOfDay: 'Afternoon' }] }
        : d
    );

    const res = await api.put(`/api/trips/${trip._id}`, { itinerary: updatedItinerary });
    onUpdate(res.data);
    setNewActivity('');
  };

  const handleRemoveActivity = async (index) => {
    const updatedItinerary = trip.itinerary.map((d) =>
      d.dayNumber === day.dayNumber ? { ...d, activities: d.activities.filter((_, i) => i !== index) } : d
    );

    const res = await api.put(`/api/trips/${trip._id}`, { itinerary: updatedItinerary });
    onUpdate(res.data);
  };

  const handleRegenerateDay = async () => {
    if (!feedback.trim()) return;
    setRegenerating(true);
    try {
      const res = await api.put(`/api/trips/${trip._id}/regenerate-day/${day.dayNumber}`, { feedback });
      onUpdate(res.data);
      setFeedback('');
    } catch(err) {
          console.error('Day regeneration failed:', err);
      alert('Could not regenerate this day. Try again.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-slate-800 mb-3">Day {day.dayNumber}</h3>

      <div className="space-y-2 mb-4">
        {day.activities.map((act, index) => (
          <div key={index} className="flex justify-between items-start bg-slate-50 p-3 rounded-lg">
            <div>
              <p className="font-semibold text-slate-700">{act.title}</p>
              <p className="text-xs text-slate-500">{act.description}</p>
              <span className="text-xs text-indigo-600">{act.timeOfDay} • ${act.estimatedCostUSD}</span>
            </div>
            <button onClick={() => handleRemoveActivity(index)} className="text-red-500 text-xs font-medium ml-3">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newActivity}
          onChange={(e) => setNewActivity(e.target.value)}
          placeholder="Add an activity..."
          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <button onClick={handleAddActivity} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">
          Add
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g. More outdoor activities"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleRegenerateDay}
          disabled={regenerating}
          className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm disabled:bg-slate-400"
        >
          {regenerating ? 'Regenerating...' : 'Regenerate Day'}
        </button>
      </div>
    </div>
  );
};

export default ItineraryDay;