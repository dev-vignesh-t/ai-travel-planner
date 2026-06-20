const BudgetSummary = ({ budget }) => {
  if (!budget) return null;

  const rows = [
    { label: 'Transport', value: budget.transport },
    { label: 'Accommodation', value: budget.accommodation },
    { label: 'Food', value: budget.food },
    { label: 'Activities', value: budget.activities }
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="font-bold text-slate-800 mb-3">Budget Breakdown</h2>
      <div className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-slate-600">
            <span>{row.label}</span>
            <span>${row.value}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-slate-800 border-t pt-2 mt-2">
          <span>Total</span>
          <span>${budget.total}</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetSummary;