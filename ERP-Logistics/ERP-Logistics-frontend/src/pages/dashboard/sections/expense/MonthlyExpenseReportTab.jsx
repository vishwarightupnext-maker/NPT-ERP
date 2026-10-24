import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays } from 'lucide-react';
import { fetchMonthlyExpenseReport } from '../../../../store/slices/officeExpenseSlice';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function MonthlyExpenseReportTab() {
  const dispatch = useDispatch();
  const { monthlyReport } = useSelector(s => s.officeExpense);
  const [year, setYear] = useState(currentYear);

  useEffect(() => { dispatch(fetchMonthlyExpenseReport({ year })); }, [year, dispatch]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Year</label>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="ml-auto text-sm font-semibold text-gray-700">Year Total: ₹{(monthlyReport?.total || 0).toLocaleString('en-IN')}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-indigo-50 rounded-xl p-2.5"><CalendarDays className="w-5 h-5 text-indigo-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Monthly Expenses — {year}</h2>
            <p className="text-xs text-gray-400">Office expense totals by month</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Month', 'Amount'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MONTHS.map((m, i) => (
                <tr key={m} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">{m}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{(monthlyReport?.byMonth?.[i] || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
