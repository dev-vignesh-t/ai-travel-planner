import { useState } from 'react';

const INTEREST_OPTIONS = ['Food', 'Culture', 'Adventure', 'Shopping', 'Nature', 'Nightlife'];

const CreateTripForm = ({ onCreate, loading }) => {
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [budgetTier, setBudgetTier] = useState('Medium');
  const [interests, setInterests] = useState([]);

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ destination, durationDays: Number(durationDays), budgetTier, interests });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Plan a New Trip</h2>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Destination</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Goa"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Number of Days</label>
        <input
          type="number"
          min="1"
          max="30"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Budget</label>
        <select
          value={budgetTier}
          onChange={(e) => setBudgetTier(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              type="button"
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1 rounded-full text-sm border ${
                interests.includes(interest)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-semibold transition"
      >
        {loading ? 'Generating Itinerary...' : 'Generate Trip'}
      </button>
    </form>
  );
};

export default CreateTripForm;