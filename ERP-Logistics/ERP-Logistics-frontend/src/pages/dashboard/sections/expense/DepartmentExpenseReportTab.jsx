import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Building2 } from 'lucide-react';
import { fetchDepartmentExpenseReport } from '../../../../store/slices/officeExpenseSlice';

export default function DepartmentExpenseReportTab() {
  const dispatch = useDispatch();
  const { departmentReport } = useSelector(s => s.officeExpense);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchDepartmentExpenseReport({ from: from || undefined, to: to || undefined }));
  }, [from, to, dispatch]);

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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-violet-50 rounded-xl p-2.5"><Building2 className="w-5 h-5 text-violet-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Department-wise Expenses</h2>
            <p className="text-xs text-gray-400">Totals grouped by department for the selected period</p>
          </div>
          <span className="ml-auto text-sm font-semibold text-gray-700">Grand Total: ₹{(departmentReport?.grandTotal || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Department', 'Amount'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!departmentReport || departmentReport.rows.length === 0) && (
                <tr><td colSpan={2} className="px-6 py-10 text-center text-gray-400">No expenses recorded for this period.</td></tr>
              )}
              {departmentReport?.rows.map(r => (
                <tr key={r.department} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">{r.department}</td>
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
