import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CreateTripForm from '../../components/CreateTripForm';
import ItineraryDay from '../../components/ItineraryDay';
import BudgetSummary from '../../components/BudgetSummary';
import HotelSuggestions from '../../components/HotelSuggestions';
import PackingList from '../../components/PackingList';

const Dashboard = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

   

  const fetchTrips = async () => {
    try {
      const res = await api.get('/api/trips');
      setTrips(res.data);
      if (res.data.length > 0) setSelectedTrip(res.data[0]);
    } catch (err) {
      console.error('Failed to fetch trips', err);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  fetchTrips();
}, []);
 


  const handleCreateTrip = async (formData) => {
    setGenerating(true);
    try {
      const res = await api.post('/api/trips', formData);
      setTrips((prev) => [res.data, ...prev]);
      setSelectedTrip(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate trip');
    } finally {
      setGenerating(false);
    }
  };

  const refreshSelectedTrip = (updatedTrip) => {
    setSelectedTrip(updatedTrip);
    setTrips((prev) => prev.map((t) => (t._id === updatedTrip._id ? updatedTrip : t)));
  };

  const handleSignOut = () => {
    Cookies.remove('token');
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">AI Travel Dashboard</h1>
        <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
          Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <CreateTripForm onCreate={handleCreateTrip} loading={generating} />

          <div className="bg-white p-4 rounded-xl shadow-md">
            <h2 className="font-bold text-slate-800 mb-3">Your Trips</h2>
            {trips.length === 0 ? (
              <p className="text-slate-500 text-sm">No trips yet. Create one above!</p>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => (
                  <button
                    key={trip._id}
                    onClick={() => setSelectedTrip(trip)}
                    className={`w-full text-left p-3 rounded-lg text-sm ${
                      selectedTrip?._id === trip._id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {trip.destination} • {trip.durationDays} days
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTrip && <BudgetSummary budget={selectedTrip.estimatedBudget} />}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedTrip ? (
            <>
              {selectedTrip.itinerary.map((day) => (
                <ItineraryDay key={day.dayNumber} day={day} trip={selectedTrip} onUpdate={refreshSelectedTrip} />
              ))}
              <HotelSuggestions hotels={selectedTrip.hotels} />
              <PackingList trip={selectedTrip} onUpdate={refreshSelectedTrip} />
            </>
          ) : (
            <div className="bg-white p-10 rounded-xl shadow-md text-center text-slate-500">
              Create a trip to get started.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;