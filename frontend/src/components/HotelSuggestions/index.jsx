const HotelSuggestions = ({ hotels }) => {
  if (!hotels || hotels.length === 0) return null;

  return (
    <div className="bg-white p-5 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-slate-800 mb-3">Recommended Hotels</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hotels.map((hotel, index) => (
          <div key={index} className="border border-slate-200 rounded-lg p-3">
            <p className="font-semibold text-slate-700 text-sm">{hotel.name}</p>
            <p className="text-xs text-slate-500">{hotel.tier}</p>
            <p className="text-xs text-indigo-600 mt-1">${hotel.estimatedCostNightUSD}/night • {hotel.rating}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelSuggestions;