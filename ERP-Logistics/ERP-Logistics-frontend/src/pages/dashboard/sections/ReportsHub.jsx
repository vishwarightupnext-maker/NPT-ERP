import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileText, Download, FileDown } from 'lucide-react';
import { fetchReportData, clearReport } from '../../../store/slices/reportsSlice';
import CustomSelect from '../../../components/CustomSelect';
import { createLetterheadDoc, drawTable } from '../../../utils/pdf';

const today = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const REPORTS = [
  { key: 'daily-trips',   label: 'Daily Trips',      filter: 'date' },
  { key: 'monthly-trips', label: 'Monthly Trips',    filter: 'year' },
  { key: 'vehicles',      label: 'Vehicle Report',   filter: 'none' },
  { key: 'drivers',       label: 'Driver Report',    filter: 'none' },
  { key: 'vendors',       label: 'Vendor Report',    filter: 'none' },
  { key: 'customers',     label: 'Customer Report',  filter: 'none' },
  { key: 'invoices',      label: 'Invoice Report',   filter: 'dateRange' },
  { key: 'expenses',      label: 'Expense Report',   filter: 'dateRange' },
  { key: 'diesel',        label: 'Diesel Report',    filter: 'dateRange' },
  { key: 'profit-loss',   label: 'Profit & Loss',    filter: 'dateRange' },
  { key: 'gst',           label: 'GST Report',       filter: 'dateRange' },
  { key: 'outstanding',   label: 'Outstanding Report', filter: 'none' },
  { key: 'collection',    label: 'Collection Report',  filter: 'dateRange' },
];

const isDateKey = (k) => k === 'Date';
const displayValue = (key, val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (isDateKey(key)) return new Date(val).toLocaleDateString('en-IN');
  if (typeof val === 'number') return val.toLocaleString('en-IN');
  return String(val);
};
const exportValue = (key, val) => {
  if (val === null || val === undefined) return '';
  if (isDateKey(key)) return new Date(val).toLocaleDateString('en-IN');
  return val;
};

function downloadCSV(filename, rows, columns) {
  if (!rows.length) return;
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    columns.join(','),
    ...rows.map(r => columns.map(c => escape(exportValue(c, r[c]))).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF(title, subtitle, rows, columns) {
  const ctx = await createLetterheadDoc(title, subtitle);
  const pdfColumns = columns.map(c => ({
    key: c, label: c, width: Math.max(14, 60 / columns.length * 3),
    align: typeof rows[0]?.[c] === 'number' ? 'right' : 'left',
  }));
  drawTable(ctx, ctx.y, pdfColumns, rows.map(r => pdfColumns.map(c => exportValue(c.key, r[c.key]))));
  ctx.doc.save(`${title.replace(/\s+/g, '-')}.pdf`);
}

const ReportsHub = () => {
  const dispatch = useDispatch();
  const { rows, loading, error } = useSelector(s => s.reports);

  const [reportKey, setReportKey] = useState(REPORTS[0].key);
  const [date, setDate] = useState(today());
  const [year, setYear] = useState(currentYear);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const report = REPORTS.find(r => r.key === reportKey);

  useEffect(() => {
    dispatch(clearReport());
    const params = {};
    if (report.filter === 'date') params.date = date;
    if (report.filter === 'year') params.year = year;
    if (report.filter === 'dateRange') { if (from) params.from = from; if (to) params.to = to; }
    dispatch(fetchReportData({ endpoint: reportKey, params }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey, date, year, from, to, dispatch]);

  const columns = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);

  const handleExportCSV = () => downloadCSV(`${report.label}.csv`, rows, columns);
  const handleExportPDF = () => downloadPDF(report.label, new Date().toLocaleDateString('en-IN'), rows, columns);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex-wrap">
        <div className="bg-red-50 rounded-xl p-2.5"><FileText className="w-5 h-5 text-red-700" /></div>
        <div>
          <h2 className="font-bold text-gray-800">Reports</h2>
          <p className="text-xs text-gray-400">Live, dynamically generated reports — download as PDF or CSV</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-64">
          <label className="block text-xs font-medium text-gray-600 mb-1">Report</label>
          <CustomSelect value={reportKey} onChange={setReportKey} options={REPORTS.map(r => ({ value: r.key, label: r.label }))} />
        </div>

        {report.filter === 'date' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        )}
        {report.filter === 'year' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        {report.filter === 'dateRange' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </>
        )}

        <div className="ml-auto flex gap-2">
          <button onClick={handleExportPDF} disabled={rows.length === 0}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-700 border border-red-100 rounded-xl px-3 py-2 text-xs font-medium">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={handleExportCSV} disabled={rows.length === 0}
            className="flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 text-gray-600 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">{report.label}</h3>
          <p className="text-xs text-gray-400">{rows.length} row{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{columns.map(c => <th key={c} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={Math.max(columns.length, 1)} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="px-6 py-10 text-center text-gray-400">No data found for this report.</td></tr>}
              {!loading && rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {columns.map(c => (
                    <td key={c} className={`px-4 py-3 whitespace-nowrap ${typeof r[c] === 'number' ? 'text-right font-medium text-gray-800' : 'text-gray-600'}`}>
                      {displayValue(c, r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsHub;
