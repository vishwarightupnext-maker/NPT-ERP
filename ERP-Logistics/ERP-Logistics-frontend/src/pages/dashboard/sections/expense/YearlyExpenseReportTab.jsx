import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart3 } from 'lucide-react';
import { fetchYearlyExpenseReport } from '../../../../store/slices/officeExpenseSlice';

export default function YearlyExpenseReportTab() {
  const dispatch = useDispatch();
  const { yearlyReport } = useSelector(s => s.officeExpense);

  useEffect(() => { dispatch(fetchYearlyExpenseReport()); }, [dispatch]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-emerald-50 rounded-xl p-2.5"><BarChart3 className="w-5 h-5 text-emerald-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Yearly Expenses</h2>
            <p className="text-xs text-gray-400">Office expense totals by year</p>
          </div>
          <span className="ml-auto text-sm font-semibold text-gray-700">Grand Total: ₹{(yearlyReport?.grandTotal || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Year', 'Amount'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!yearlyReport || yearlyReport.rows.length === 0) && (
                <tr><td colSpan={2} className="px-6 py-10 text-center text-gray-400">No expenses recorded yet.</td></tr>
              )}
              {yearlyReport?.rows.map(r => (
                <tr key={r.year} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">{r.year}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{r.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
