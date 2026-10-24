import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ListChecks, PieChart, TrendingUp, Fuel } from 'lucide-react';
import { fetchVehicles } from '../../../../store/slices/vehiclesSlice';
import ExpenseTrackTab from './ExpenseTrackTab';
import ExpenseSummaryTab from './ExpenseSummaryTab';
import ProfitLossTab from './ProfitLossTab';
import DieselConsumptionTab from './DieselConsumptionTab';

const TABS = [
  { key: 'track',   label: 'Track Expenses',    icon: ListChecks },
  { key: 'summary', label: 'Expense Summary',    icon: PieChart },
  { key: 'pl',      label: 'Trip Profit/Loss',   icon: TrendingUp },
  { key: 'diesel',  label: 'Diesel Consumption', icon: Fuel },
];

const TripExpenseHub = () => {
  const dispatch = useDispatch();
  const { list: vehicles } = useSelector(s => s.vehicles);
  const [tab, setTab] = useState('track');
  const [vehicleId, setVehicleId] = useState('');

  useEffect(() => { dispatch(fetchVehicles()); }, [dispatch]);

  const vehicle = vehicles.find(v => v._id === vehicleId);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Select Truck / Vehicle</label>
        <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full sm:w-96 border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="">— Select a vehicle —</option>
          {vehicles.map(v => <option key={v._id} value={v._id}>{v.registrationNo} — {v.type}</option>)}
        </select>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {!vehicleId && (
        <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
          Select a truck above to track its expenses and view its reports.
        </p>
      )}

      {vehicleId && tab === 'track'   && <ExpenseTrackTab key={vehicleId} vehicleId={vehicleId} vehicle={vehicle} />}
      {vehicleId && tab === 'summary' && <ExpenseSummaryTab vehicleId={vehicleId} />}
      {vehicleId && tab === 'pl'      && <ProfitLossTab vehicleId={vehicleId} />}
      {vehicleId && tab === 'diesel'  && <DieselConsumptionTab vehicleId={vehicleId} />}
    </div>
  );
};

export default TripExpenseHub;
