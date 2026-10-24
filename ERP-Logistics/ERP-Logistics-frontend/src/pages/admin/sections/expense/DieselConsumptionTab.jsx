import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Fuel } from 'lucide-react';
import { fetchDieselConsumption } from '../../../../store/slices/tripExpenseSlice';

export default function DieselConsumptionTab({ vehicleId }) {
  const dispatch = useDispatch();
  const { dieselConsumption: dc } = useSelector(s => s.tripExpense);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchDieselConsumption({ vehicleId, from: from || undefined, to: to || undefined }));
  }, [vehicleId, from, to, dispatch]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
      </div>

      {dc && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-sky-50 rounded-2xl p-4"><p className="text-xs text-sky-600">Total Diesel (L)</p><p className="text-xl font-bold text-sky-700">{dc.totalLiters.toLocaleString('en-IN')}</p></div>
          <div className="bg-amber-50 rounded-2xl p-4"><p className="text-xs text-amber-600">Diesel Cost</p><p className="text-xl font-bold text-amber-700">₹{dc.totalDieselCost.toLocaleString('en-IN')}</p></div>
          <div className="bg-indigo-50 rounded-2xl p-4"><p className="text-xs text-indigo-600">Distance Covered</p><p className="text-xl font-bold text-indigo-700">{dc.totalDistance.toLocaleString('en-IN')} km</p></div>
          <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-xs text-emerald-600">Avg Mileage</p><p className="text-xl font-bold text-emerald-700">{dc.avgMileage ? `${dc.avgMileage} km/L` : '—'}</p></div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-sky-50 rounded-xl p-2.5"><Fuel className="w-5 h-5 text-sky-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Diesel Fill Entries</h2>
            <p className="text-xs text-gray-400">All "Diesel Expense" entries for the selected period</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Date', 'Liters', 'Amount', 'Odometer', 'Notes'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!dc || dc.entries.length === 0) && <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No diesel entries recorded.</td></tr>}
              {dc?.entries.map(e => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{e.liters || '—'}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.odometerKm || '—'}</td>
                  <td className="px-5 py-4 text-gray-400 max-w-[200px] truncate">{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
