import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileBarChart, Download, FileDown } from 'lucide-react';
import { fetchVendors, fetchVendorCommissions, fetchCommissionSummary } from '../../../../store/slices/vendorSlice';
import { createLetterheadDoc, drawTable } from '../../../../utils/pdf';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF(rows) {
  const ctx = await createLetterheadDoc('Vendor Commission Report', new Date().toLocaleDateString('en-IN'));
  const columns = [
    { key: 'VendorCode', label: 'Code', width: 20 }, { key: 'Vendor', label: 'Vendor', width: 32 },
    { key: 'Type', label: 'Type', width: 20 }, { key: 'Period', label: 'Period', width: 20 },
    { key: 'Amount', label: 'Amount (₹)', width: 22, align: 'right' }, { key: 'Status', label: 'Status', width: 18 },
  ];
  drawTable(ctx, ctx.y, columns, rows.map(r => columns.map(c => r[c.key])));
  ctx.doc.save('vendor-commission-report.pdf');
}

export default function CommissionReportsTab() {
  const dispatch = useDispatch();
  const { list: vendors, commissions, summary } = useSelector(s => s.vendor);
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchCommissionSummary());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchVendorCommissions({
      vendorId: vendorFilter || undefined,
      status: statusFilter || undefined,
    }));
  }, [vendorFilter, statusFilter, dispatch]);

  const rows = useMemo(() => commissions.map(c => ({
    VendorCode: c.vendorCode, Vendor: c.vendorName, Type: c.commissionType,
    Period: c.month && c.year ? `${MONTHS[c.month - 1]} ${c.year}` : '—',
    Amount: c.calculatedAmount, Status: c.status,
  })), [commissions]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="bg-red-50 rounded-xl p-2.5"><FileBarChart className="w-5 h-5 text-red-700" /></div>
        <div>
          <h2 className="font-bold text-gray-800">Commission Reports</h2>
          <p className="text-xs text-gray-400">Full vendor commission ledger</p>
        </div>
        <div className="ml-auto flex gap-2">
          <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
          <button onClick={() => downloadPDF(rows)} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 rounded-xl px-3 py-2 text-xs font-medium">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => downloadCSV('vendor-commission-report.csv', rows)} className="flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-600 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50 rounded-2xl p-4"><p className="text-xs text-amber-600">Pending Entries</p><p className="text-xl font-bold text-amber-700">{summary.pendingCount}</p></div>
          <div className="bg-amber-50 rounded-2xl p-4"><p className="text-xs text-amber-600">Pending Total</p><p className="text-xl font-bold text-amber-700">₹{summary.pendingTotal.toLocaleString('en-IN')}</p></div>
          <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-xs text-emerald-600">Paid Entries</p><p className="text-xl font-bold text-emerald-700">{summary.paidCount}</p></div>
          <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-xs text-emerald-600">Paid Total</p><p className="text-xl font-bold text-emerald-700">₹{summary.paidTotal.toLocaleString('en-IN')}</p></div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Code', 'Vendor', 'Type', 'Period', 'Amount', 'Status'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No commission entries found.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">{r.VendorCode}</td>
                  <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{r.Vendor}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{r.Type}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{r.Period}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{r.Amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.Status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.Status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
