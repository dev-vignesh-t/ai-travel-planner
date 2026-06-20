const PackingList = ({ trip }) => {
  if (!trip?.packingList?.length) return null;
  return (
    <div className="bg-white p-5 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-slate-800 mb-3">Packing List</h3>
      <p className="text-sm text-slate-500">Full interactive checklist coming in Day 3.</p>
    </div>
  );
};

export default PackingList;