import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, Trash2, Pencil, Truck, Download, FileDown, X,
  Calculator, Wallet, ArrowRight, CheckCircle2, AlertCircle, Receipt, Zap
} from 'lucide-react';
import { fetchVendors } from '../../../../store/slices/vendorSlice';
import {
  fetchVendorTrips, createVendorTrip, updateVendorTrip, deleteVendorTrip, fetchVendorTripSummary,
} from '../../../../store/slices/vendorTripSlice';
import { fetchVendorVehicles, createVendorVehicle, deleteVendorVehicle } from '../../../../store/slices/vendorVehicleSlice';
import CustomSelect from '../../../../components/CustomSelect';
import { createLetterheadDoc, drawTable } from '../../../../utils/pdf';

const today = () => new Date().toISOString().slice(0, 10);
const emptyCashEntry = () => ({ date: today(), amount: '' });
const emptySettlementEntry = () => ({ date: today(), amount: '' });

const emptyForm = {
  date: today(),
  vehicleNo: '',
  driverName: '',
  connectivity: '',
  diesel: '',
  cashEntries: [emptyCashEntry()],
  settlementEntries: [emptySettlementEntry()],
  settlement: '',
  settlementDate: today(),
  remarks: '',
  pod: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition';

const Field = ({ label, children, extra }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {extra}
    </div>
    {children}
  </div>
);

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

// Ledger columns for CSV & PDF export (Landscape layout = 273mm total width)
const LEDGER_COLUMNS = [
  { key: 'S.No',        label: 'S.No',               width: 8 },
  { key: 'Date',        label: 'Trip Date',          width: 16 },
  { key: 'Vehicle No',  label: 'Vehicle No',         width: 18 },
  { key: 'Driver',      label: 'Driver Name',        width: 18 },
  { key: 'Docket No',   label: 'Docket No',          width: 16 },
  { key: 'Connectivity',label: 'Connectivity (Cost)', width: 22, align: 'right' },
  { key: 'Diesel',      label: 'Diesel Adv.',        width: 18, align: 'right' },
  { key: 'Cash',        label: 'Cash Advances (Split Date & Remarks)', width: 40, align: 'left' },
  { key: 'Advance',     label: 'Total Advance',      width: 20, align: 'right' },
  { key: 'Settlement',  label: 'Settlement Paid (Split Date & Remarks)', width: 44, align: 'left' },
  { key: 'Balance',     label: 'Balance Due',        width: 20, align: 'right' },
  { key: 'Remarks',     label: 'Trip Remarks',       width: 18 },
  { key: 'POD',         label: 'POD',                width: 15 },
];

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

async function downloadLedgerPDF(vendorName, rows) {
  const ctx = await createLetterheadDoc('Vendor Trip Ledger', vendorName, 'landscape');
  drawTable(ctx, ctx.y, LEDGER_COLUMNS, rows.map(r => LEDGER_COLUMNS.map(c => r[c.key])));
  ctx.doc.save(`${vendorName.replace(/\s+/g, '-')}-trip-ledger.pdf`);
}

export default function VendorTripLedgerTab() {
  const dispatch = useDispatch();
  const { list: vendors } = useSelector(s => s.vendor);
  const { list: entries, loading, summary } = useSelector(s => s.vendorTrip);
  const { list: vendorVehicles } = useSelector(s => s.vendorVehicle);

  const [vendorId, setVendorId] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [newVehicleNo, setNewVehicleNo] = useState('');
  const [vehicleError, setVehicleError] = useState('');

  // Drawer & Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingDocketNo, setEditingDocketNo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [settlementDateFilter, setSettlementDateFilter] = useState('');

  useEffect(() => { dispatch(fetchVendors()); }, [dispatch]);

  useEffect(() => {
    if (!vendorId) return;
    dispatch(fetchVendorVehicles(vendorId));
    setVehicleFilter('');
  }, [vendorId, dispatch]);

  useEffect(() => {
    if (!vendorId) return;
    dispatch(fetchVendorTrips({ vendorId }));
    dispatch(fetchVendorTripSummary(vendorId));
  }, [vendorId, dispatch]);

  const refresh = () => {
    if (!vendorId) return;
    dispatch(fetchVendorTrips({ vendorId }));
    dispatch(fetchVendorTripSummary(vendorId));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const resetForm = () => {
    setForm({
      date: today(),
      vehicleNo: '',
      driverName: '',
      connectivity: '',
      diesel: '',
      cashEntries: [emptyCashEntry()],
      settlementEntries: [emptySettlementEntry()],
      settlement: '',
      settlementDate: today(),
      remarks: '',
      pod: '',
    });
    setEditingId(null);
    setEditingDocketNo('');
    setError('');
  };

  const openAdd = () => {
    resetForm();
    setShowDrawer(true);
  };

  const openEdit = (e) => {
    setEditingId(e._id);
    setEditingDocketNo(e.docketNo || '');
    const sEntries = e.settlementEntries?.length
      ? e.settlementEntries.map(s => ({
          date: s.date ? s.date.slice(0, 10) : today(),
          amount: String(s.amount || ''),
          remarks: s.remarks || '',
        }))
      : (e.settlement > 0
          ? [{ date: e.settlementDate ? e.settlementDate.slice(0, 10) : (e.updatedAt ? e.updatedAt.slice(0, 10) : today()), amount: String(e.settlement), remarks: '' }]
          : [emptySettlementEntry()]);

    setForm({
      date: e.date ? e.date.slice(0, 10) : today(),
      vehicleNo: e.vehicleNo || '',
      driverName: e.driverName || '',
      connectivity: String(e.connectivity || ''),
      diesel: String(e.diesel || ''),
      cashEntries: e.cashEntries?.length
        ? e.cashEntries.map(c => ({
            date: c.date ? c.date.slice(0, 10) : today(),
            amount: String(c.amount || ''),
            remarks: c.remarks || '',
          }))
        : [emptyCashEntry()],
      settlementEntries: sEntries,
      settlement: String(e.settlement || ''),
      settlementDate: e.settlementDate ? e.settlementDate.slice(0, 10) : (e.settlement > 0 && e.updatedAt ? e.updatedAt.slice(0, 10) : today()),
      remarks: e.remarks || '',
      pod: e.pod || '',
    });
    setError('');
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    resetForm();
  };

  const handleAddVehicle = async () => {
    if (!newVehicleNo.trim()) return;
    setVehicleError('');
    try {
      await dispatch(createVendorVehicle({ vendorId, vehicleNo: newVehicleNo.trim() })).unwrap();
      setNewVehicleNo('');
    } catch (err) { setVehicleError(err || 'Failed to add vehicle.'); }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Remove this vehicle from the vendor? Existing trip entries for it are kept.')) return;
    await dispatch(deleteVendorVehicle(id)).unwrap().catch(() => {});
  };

  // Calculation for current form
  const connectivityNum = parseFloat(form.connectivity) || 0;
  const dieselNum = parseFloat(form.diesel) || 0;
  const cashTotal = form.cashEntries.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
  const advanceTotal = dieselNum + cashTotal;
  const initialDueNum = connectivityNum - advanceTotal;
  
  const settlementTotalFromEntries = form.settlementEntries.reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);
  const settlementNum = settlementTotalFromEntries > 0 || form.settlementEntries.some(s => s.amount !== '')
    ? settlementTotalFromEntries
    : (parseFloat(form.settlement) || 0);

  const balanceNum = initialDueNum - settlementNum;

  // Add Cash Row (opens a fresh empty input row)
  const addCashRow = () => {
    setForm(f => ({
      ...f,
      cashEntries: [...f.cashEntries, { date: today(), amount: '', remarks: '' }],
    }));
  };

  const removeCashRow = (i) => setForm(f => ({ ...f, cashEntries: f.cashEntries.filter((_, idx) => idx !== i) }));
  const setCashRow = (i, key, val) => setForm(f => ({
    ...f, cashEntries: f.cashEntries.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)),
  }));

  // Add Settlement Row (opens a fresh empty input row)
  const addSettlementRow = () => {
    setForm(f => ({
      ...f,
      settlementEntries: [...f.settlementEntries, { date: today(), amount: '', remarks: '' }],
    }));
  };

  const removeSettlementRow = (i) => setForm(f => ({ ...f, settlementEntries: f.settlementEntries.filter((_, idx) => idx !== i) }));
  const setSettlementRow = (i, key, val) => setForm(f => ({
    ...f, settlementEntries: f.settlementEntries.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)),
  }));

  // Auto-Load Balance action (triggered via button click)
  const fillFullSettlement = () => {
    setForm(f => {
      const conn = parseFloat(f.connectivity) || 0;
      const dsl = parseFloat(f.diesel) || 0;
      const cTotal = f.cashEntries.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
      const initialDue = conn - (dsl + cTotal);
      if (initialDue <= 0) return f;

      const emptyIdx = f.settlementEntries.findIndex(s => s.amount === '' || s.amount === undefined);
      if (emptyIdx !== -1) {
        const currentFilled = f.settlementEntries.reduce((a, s, idx) => idx === emptyIdx ? a : a + (parseFloat(s.amount) || 0), 0);
        const due = initialDue - currentFilled;
        if (due <= 0) return f;
        return {
          ...f,
          settlementEntries: f.settlementEntries.map((s, idx) => (idx === emptyIdx ? { ...s, amount: String(due) } : s)),
        };
      }

      const currentTotalSettle = f.settlementEntries.reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);
      const rem = initialDue - currentTotalSettle;
      if (rem <= 0) return f;
      return {
        ...f,
        settlementEntries: [...f.settlementEntries, { date: today(), amount: String(rem), remarks: '' }],
      };
    });
  };

  // Clear Settlement action
  const clearSettlement = () => {
    setForm(f => ({
      ...f,
      settlementEntries: [emptySettlementEntry()],
      settlement: '0',
    }));
  };

  const handleSave = async () => {
    if (!form.vehicleNo.trim()) { setError('Select or add a vehicle first.'); return; }
    setSaving(true); setError('');
    const validCash = form.cashEntries.filter(c => c.amount !== '');
    const validSettlement = form.settlementEntries.filter(s => s.amount !== '');
    const totalSettle = validSettlement.reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);

    const payload = {
      ...form,
      cashEntries: validCash,
      settlementEntries: validSettlement,
      settlement: totalSettle,
    };
    try {
      if (editingId) await dispatch(updateVendorTrip({ id: editingId, ...payload })).unwrap();
      else await dispatch(createVendorTrip({ vendorId, ...payload })).unwrap();
      closeDrawer();
      refresh();
    } catch (err) { setError(err || 'Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trip entry?')) return;
    await dispatch(deleteVendorTrip(id)).unwrap().catch(() => {});
    refresh();
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchVehicle = !vehicleFilter || e.vehicleNo === vehicleFilter;
      let matchSettlementDate = true;
      if (settlementDateFilter) {
        const hasSplitMatch = e.settlementEntries?.some(s => s.date && new Date(s.date).toISOString().slice(0, 10) === settlementDateFilter);
        const sDateStr = e.settlementDate
          ? new Date(e.settlementDate).toISOString().slice(0, 10)
          : (e.settlement > 0 && e.updatedAt ? new Date(e.updatedAt).toISOString().slice(0, 10) : '');
        if (!hasSplitMatch && sDateStr !== settlementDateFilter) matchSettlementDate = false;
      }
      return matchVehicle && matchSettlementDate;
    });
  }, [entries, vehicleFilter, settlementDateFilter]);

  const vendorName = vendors.find(v => v._id === vendorId)?.name || 'vendor';

  const formatSplitCell = (entriesArr, fallbackAmount, fallbackDate) => {
    if (entriesArr && entriesArr.length > 0 && entriesArr.some(e => Number(e.amount) > 0)) {
      return entriesArr
        .filter(e => Number(e.amount) > 0)
        .map(e => {
          const dStr = new Date(e.date).toLocaleDateString('en-IN');
          const aStr = `₹${Number(e.amount).toLocaleString('en-IN')}`;
          const rStr = e.remarks ? ` (${e.remarks})` : '';
          return `${dStr}: ${aStr}${rStr}`;
        })
        .join('\n');
    }
    if (fallbackAmount > 0) {
      const dStr = fallbackDate ? new Date(fallbackDate).toLocaleDateString('en-IN') + ': ' : '';
      return `${dStr}₹${Number(fallbackAmount).toLocaleString('en-IN')}`;
    }
    return `₹0`;
  };

  const buildExportRows = () => {
    const rows = filteredEntries.map((e, i) => ({
      'S.No': i + 1,
      Date: new Date(e.date).toLocaleDateString('en-IN'),
      'Vehicle No': e.vehicleNo,
      Driver: e.driverName || '—',
      'Docket No': e.docketNo,
      Connectivity: `₹${(e.connectivity || 0).toLocaleString('en-IN')}`,
      Diesel: `₹${(e.diesel || 0).toLocaleString('en-IN')}`,
      Cash: formatSplitCell(e.cashEntries, e.cash),
      Advance: `₹${(e.advance || 0).toLocaleString('en-IN')}`,
      Settlement: formatSplitCell(e.settlementEntries, e.settlement, e.settlementDate),
      Balance: `₹${(e.balance || 0).toLocaleString('en-IN')}`,
      Remarks: e.remarks || '—',
      POD: e.pod || '—',
    }));
    if (summary && !vehicleFilter) {
      rows.push({
        'S.No': '', Date: '', 'Vehicle No': '', Driver: '', 'Docket No': 'TOTAL',
        Connectivity: `₹${(summary.connectivity || 0).toLocaleString('en-IN')}`,
        Diesel: `₹${(summary.diesel || 0).toLocaleString('en-IN')}`,
        Cash: `₹${(summary.cash || 0).toLocaleString('en-IN')}`,
        Advance: `₹${(summary.advance || 0).toLocaleString('en-IN')}`,
        Settlement: `₹${(summary.settlement || 0).toLocaleString('en-IN')}`,
        Balance: `₹${(summary.balance || 0).toLocaleString('en-IN')}`,
        Remarks: '', POD: '',
      });
    }
    return rows;
  };

  const handleExportCSV = () => downloadCSV(`${vendorName.replace(/\s+/g, '-')}-trip-ledger.csv`, buildExportRows());
  const handleExportPDF = () => downloadLedgerPDF(vendorName, buildExportRows());

  return (
    <div className="space-y-4">
      {/* Vendor Selector Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Select Vendor</label>
        <div className="w-full sm:w-96">
          <CustomSelect
            value={vendorId}
            onChange={(val) => { setVendorId(val); resetForm(); }}
            options={vendors.map(v => ({ value: v._id, label: `${v.name} (${v.vendorCode})` }))}
            placeholder="— Select a vendor —"
            className={inputCls}
          />
        </div>
      </div>

      {!vendorId && (
        <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100">
          Select a vendor above to view their trip ledger, register vehicles, and log entries.
        </p>
      )}

      {vendorId && (
        <>
          {/* Summary KPI Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">Total Connectivity</p>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Receipt className="w-4 h-4" /></div>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.connectivity)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{summary.count || 0} trip entries total</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">Total Advances</p>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Wallet className="w-4 h-4" /></div>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.advance)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Diesel: {fmt(summary.diesel)} | Cash: {fmt(summary.cash)}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">Total Settled</p>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></div>
                </div>
                <p className="text-xl font-bold text-emerald-700 mt-1">{fmt(summary.settlement)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Amount settled to vendor</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">Net Balance Due</p>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle className="w-4 h-4" /></div>
                </div>
                <p className={`text-xl font-bold mt-1 ${summary.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {fmt(summary.balance)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Remaining vendor payout</p>
              </div>
            </div>
          )}

          {/* Vendor's registered vehicles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Vendor Vehicles</h3>
            {vehicleError && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{vehicleError}</p>}
            <div className="flex flex-wrap gap-2 mb-3">
              {vendorVehicles.map(v => (
                <span key={v._id} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  <Truck className="w-3 h-3" /> {v.vehicleNo}
                  <button onClick={() => handleDeleteVehicle(v._id)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
              {vendorVehicles.length === 0 && <p className="text-xs text-gray-400">No vehicles added yet — add this vendor's trucks below.</p>}
            </div>
            <div className="flex gap-2">
              <input value={newVehicleNo} onChange={e => setNewVehicleNo(e.target.value)} placeholder="e.g. NL01AJ4271"
                className={`${inputCls} max-w-xs`} onKeyDown={e => e.key === 'Enter' && handleAddVehicle()} />
              <button onClick={handleAddVehicle} className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium px-3 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Add Vehicle
              </button>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-xl p-2.5"><Truck className="w-5 h-5 text-blue-700" /></div>
                <div>
                  <h2 className="font-bold text-gray-800">Vendor Trip Ledger</h2>
                  <p className="text-xs text-gray-400">{vendorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-44">
                  <CustomSelect value={vehicleFilter} onChange={setVehicleFilter}
                    options={vendorVehicles.map(v => ({ value: v.vehicleNo, label: v.vehicleNo }))} placeholder="All Vehicles" />
                </div>
                {/* Settlement Date Filter */}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs">
                  <span className="text-gray-500 font-medium">Settle Date:</span>
                  <input
                    type="date"
                    value={settlementDateFilter}
                    onChange={e => setSettlementDateFilter(e.target.value)}
                    className="bg-transparent text-xs text-gray-700 focus:outline-none"
                  />
                  {settlementDateFilter && (
                    <button onClick={() => setSettlementDateFilter('')} className="text-gray-400 hover:text-red-500 font-bold ml-1">✕</button>
                  )}
                </div>
                <button onClick={handleExportPDF} disabled={filteredEntries.length === 0}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-700 border border-red-100 rounded-xl px-3 py-2 text-xs font-medium transition">
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={handleExportCSV} disabled={filteredEntries.length === 0}
                  className="flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 text-gray-600 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium transition">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={openAdd} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm">
                  <Plus className="w-4 h-4" /> Add Trip Entry
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['S.No', 'Date', 'Vehicle No', 'Driver', 'Docket No', 'Connectivity', 'Diesel', 'Cash Advances (Split)', 'Advance', 'Settlement Paid (Split)', 'Balance', 'Remarks', 'POD', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && <tr><td colSpan={14} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
                  {!loading && filteredEntries.length === 0 && <tr><td colSpan={14} className="px-6 py-10 text-center text-gray-400">No trip entries match filters.</td></tr>}
                  {filteredEntries.map((e, i) => (
                    <tr key={e._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{e.vehicleNo}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.driverName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">{e.docketNo}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{fmt(e.connectivity)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(e.diesel)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-pre-line">
                        {formatSplitCell(e.cashEntries, e.cash)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{fmt(e.advance)}</td>
                      <td className="px-4 py-3 text-emerald-700 font-medium text-xs font-mono whitespace-pre-line">
                        {formatSplitCell(e.settlementEntries, e.settlement, e.settlementDate)}
                      </td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${e.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(e.balance)}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{e.remarks || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">{e.pod || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(e)} className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition" title="Edit Entry">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(e._id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Entry">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {summary && filteredEntries.length > 0 && !vehicleFilter && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-gray-800 border-t-2 border-gray-200">
                      <td className="px-4 py-3" colSpan={5}>TOTAL</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(summary.connectivity)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(summary.diesel)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(summary.cash)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(summary.advance)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(summary.settlement)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(summary.balance)}</td>
                      <td className="px-4 py-3" colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* Slide-Over Drawer on the Right Side */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  {editingId ? 'Edit Vendor Trip Entry' : 'Add Vendor Trip Entry'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingId ? `Editing ${editingDocketNo}` : `New trip entry for ${vendorName}`}
                </p>
              </div>
              <button onClick={closeDrawer} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Trip Date">
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Vehicle No *">
                  <CustomSelect
                    value={form.vehicleNo}
                    onChange={val => set('vehicleNo', val)}
                    options={vendorVehicles.map(v => ({ value: v.vehicleNo, label: v.vehicleNo }))}
                    placeholder="— Select vehicle —"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Truck Driver Name">
                <input value={form.driverName} onChange={e => set('driverName', e.target.value)} className={inputCls} placeholder="e.g. Ramesh Kumar" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost / Connectivity (Total Freight ₹)">
                  <input
                    type="number"
                    min={0}
                    value={form.connectivity}
                    onChange={e => set('connectivity', e.target.value)}
                    onWheel={e => e.target.blur()}
                    className={inputCls}
                    placeholder="e.g. 50000"
                  />
                </Field>
                <Field label="Diesel Advance (₹)">
                  <input
                    type="number"
                    min={0}
                    value={form.diesel}
                    onChange={e => set('diesel', e.target.value)}
                    onWheel={e => e.target.blur()}
                    className={inputCls}
                    placeholder="e.g. 10000"
                  />
                </Field>
              </div>

              {/* Cash Advances list (Split payments) */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Cash Advance (split by date)</label>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Total Cash: {fmt(cashTotal)}</span>
                </div>
                {form.cashEntries.map((c, i) => (
                  <div key={i} className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <input type="date" value={c.date} onChange={e => setCashRow(i, 'date', e.target.value)} className={`${inputCls} max-w-[140px] text-xs`} />
                      <input
                        type="number"
                        min={0}
                        value={c.amount}
                        onChange={e => setCashRow(i, 'amount', e.target.value)}
                        onWheel={e => e.target.blur()}
                        placeholder="Amount (₹)"
                        className={`${inputCls} w-32 text-xs font-semibold text-blue-800`}
                      />
                      <div className="flex items-center gap-1 ml-auto">
                        {form.cashEntries.length > 1 && (
                          <button onClick={() => removeCashRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove row">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {i === form.cashEntries.length - 1 && (
                          <button onClick={addCashRow} title="Add another date/amount with auto-loaded balance" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5" /> Add Row
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={c.remarks || ''}
                      onChange={e => setCashRow(i, 'remarks', e.target.value)}
                      placeholder="Payment Remarks / Cash voucher note..."
                      className={`${inputCls} w-full text-xs bg-gray-50/70`}
                    />
                  </div>
                ))}
              </div>

              {/* Settlement Payments list (Split payments) */}
              <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/20 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-emerald-800">Settlement Payment (split by date)</label>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">Total: {fmt(settlementNum)}</span>
                  </div>
                  {initialDueNum > 0 && (
                    <button
                      type="button"
                      onClick={fillFullSettlement}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs transition"
                    >
                      <Zap className="w-3.5 h-3.5" /> Auto-Load Balance ({fmt(balanceNum > 0 ? balanceNum : initialDueNum)})
                    </button>
                  )}
                </div>
                {form.settlementEntries.map((s, i) => (
                  <div key={i} className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <input type="date" value={s.date} onChange={e => setSettlementRow(i, 'date', e.target.value)} className={`${inputCls} max-w-[140px] text-xs`} />
                      <input
                        type="number"
                        min={0}
                        value={s.amount}
                        onChange={e => setSettlementRow(i, 'amount', e.target.value)}
                        onWheel={e => e.target.blur()}
                        placeholder="Amount (₹)"
                        className={`${inputCls} w-36 text-xs font-bold text-emerald-800 bg-emerald-50/30`}
                      />
                      <div className="flex items-center gap-1 ml-auto">
                        {form.settlementEntries.length > 1 && (
                          <button onClick={() => removeSettlementRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove row">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {i === form.settlementEntries.length - 1 && (
                          <button onClick={addSettlementRow} title="Add another date/amount with auto-loaded balance" className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5" /> Add Row
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={s.remarks || ''}
                      onChange={e => setSettlementRow(i, 'remarks', e.target.value)}
                      placeholder="Type Payment Remarks (e.g. Bank Transfer, GPay, Check #1234, HDFC Ref)..."
                      className={`${inputCls} w-full text-xs bg-emerald-50/20`}
                    />
                  </div>
                ))}
              </div>

              {/* Calculation Summary Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs shadow-md">
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Total Connectivity (Freight):</span>
                  <span className="text-white font-mono">{fmt(connectivityNum)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Less Total Advance (Diesel + Cash):</span>
                  <span className="text-rose-400 font-mono">− {fmt(advanceTotal)}</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between font-semibold text-slate-300">
                  <span>Net Due Before Settlement:</span>
                  <span className="font-mono text-amber-400">{fmt(initialDueNum)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Less Total Settlement (Paid):</span>
                  <span className="text-emerald-400 font-mono">− {fmt(settlementNum)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-bold">
                  <span>Remaining Balance Due:</span>
                  <span className={`font-mono ${balanceNum > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {fmt(balanceNum)}
                  </span>
                </div>
              </div>

              {/* Quick Action Chips */}
              {/* <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-medium">Quick Fill:</span>
                <button
                  type="button"
                  onClick={fillFullSettlement}
                  disabled={initialDueNum <= 0}
                  className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-700 px-2.5 py-1 rounded-lg font-medium border border-emerald-200/60 transition"
                >
                  <Zap className="w-3 h-3 text-emerald-600" /> Settle Full Due ({fmt(initialDueNum)})
                </button>
                <button
                  type="button"
                  onClick={clearSettlement}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-medium transition"
                >
                  Clear (₹0)
                </button>
              </div> */}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Remarks">
                  <input value={form.remarks} onChange={e => set('remarks', e.target.value)} className={inputCls} placeholder="Optional notes" />
                </Field>
                <Field label="POD (Proof of Delivery)">
                  <input value={form.pod} onChange={e => set('pod', e.target.value)} className={inputCls} placeholder="Status / reference" />
                </Field>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={closeDrawer} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Trip Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
