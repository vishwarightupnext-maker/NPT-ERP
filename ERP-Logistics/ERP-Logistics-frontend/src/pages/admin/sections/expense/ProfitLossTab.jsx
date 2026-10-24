import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fetchProfitLoss } from '../../../../store/slices/tripExpenseSlice';

export default function ProfitLossTab({ vehicleId }) {
  const dispatch = useDispatch();
  const { profitLoss: pl } = useSelector(s => s.tripExpense);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchProfitLoss({ vehicleId, from: from || undefined, to: to || undefined }));
  }, [vehicleId, from, to, dispatch]);

  const positive = pl && pl.profitLoss >= 0;

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

      {pl && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-2xl p-4">
            <p className="text-xs text-emerald-600">Revenue (Freight Billed)</p>
            <p className="text-xl font-bold text-emerald-700">₹{pl.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-xs text-red-600">Total Trip Expenses</p>
            <p className="text-xl font-bold text-red-700">₹{pl.totalExpense.toLocaleString('en-IN')}</p>
          </div>
          <div className={`rounded-2xl p-4 ${positive ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className={`text-xs flex items-center gap-1 ${positive ? 'text-blue-600' : 'text-orange-600'}`}>
              {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />} {positive ? 'Profit' : 'Loss'}
            </p>
            <p className={`text-xl font-bold ${positive ? 'text-blue-700' : 'text-orange-700'}`}>₹{Math.abs(pl.profitLoss).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Expense Breakdown</h2>
          <p className="text-xs text-gray-400">{pl?.registrationNo}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Category', 'Amount'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!pl || Object.keys(pl.expensesByCategory || {}).length === 0) && (
                <tr><td colSpan={2} className="px-6 py-10 text-center text-gray-400">No expenses recorded for this period.</td></tr>
              )}
              {pl && Object.entries(pl.expensesByCategory).map(([cat, amt]) => (
                <tr key={cat} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">{cat}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{amt.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
