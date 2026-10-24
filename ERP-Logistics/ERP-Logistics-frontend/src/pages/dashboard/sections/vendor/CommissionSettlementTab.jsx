import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, Plus, CheckCircle2, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { fetchVendors } from '../../../../store/slices/vendorSlice';
import {
  fetchVendorCommissions, createVendorCommission,
  updateVendorCommissionStatus, deleteVendorCommission,
} from '../../../../store/slices/vendorSlice';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();
const today = () => now.toISOString().slice(0, 10);
const COMMISSION_TYPES = ['Percentage', 'Fixed', 'Per Load', 'Monthly'];

const statusColor = { Pending: 'bg-amber-50 text-amber-700', Paid: 'bg-emerald-50 text-emerald-700' };
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);

const emptyEntry = { commissionType: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), baseAmount: '', loadCount: '', rate: '', settlementDate: today(), notes: '' };

export default function CommissionSettlementTab() {
  const dispatch = useDispatch();
  const { list: vendors, commissions } = useSelector(s => s.vendor);

  const [selVendor, setSelVendor] = useState('');
  const [filter, setFilter] = useState('All'); // All | Pending | Paid
  const [settlementDateFilter, setSettlementDateFilter] = useState('');
  const [entry, setEntry] = useState(emptyEntry);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const vendor = vendors.find(v => v._id === selVendor);

  useEffect(() => { dispatch(fetchVendors()); }, [dispatch]);
  useEffect(() => {
    if (vendor) setEntry(e => ({ ...e, commissionType: vendor.commissionType, rate: String(vendor.commissionRate ?? '') }));
  }, [vendor]);

  useEffect(() => {
    dispatch(fetchVendorCommissions(selVendor ? { vendorId: selVendor } : {}));
  }, [selVendor, dispatch]);

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      const matchStatus = filter === 'All' || c.status === filter;
      let matchDate = true;
      if (settlementDateFilter) {
        const sDateStr = c.settlementDate
          ? new Date(c.settlementDate).toISOString().slice(0, 10)
          : (c.paidAt ? new Date(c.paidAt).toISOString().slice(0, 10) : '');
        if (sDateStr !== settlementDateFilter) matchDate = false;
      }
      return matchStatus && matchDate;
    });
  }, [commissions, filter, settlementDateFilter]);

  const handleAdd = async () => {
    if (!selVendor) { setError('Select a vendor first.'); return; }
    setSaving(true); setError('');
    try {
      await dispatch(createVendorCommission({
        vendorId: selVendor, commissionType: entry.commissionType,
        month: entry.month, year: entry.year,
        baseAmount: entry.baseAmount, loadCount: entry.loadCount, rate: entry.rate,
        settlementDate: entry.settlementDate,
        notes: entry.notes,
      })).unwrap();
      setEntry(e => ({ ...e, baseAmount: '', loadCount: '', notes: '' }));
    } catch (err) { setError(err || 'Failed to add commission entry.'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (c) => {
    const nextStatus = c.status === 'Paid' ? 'Pending' : 'Paid';
    await dispatch(updateVendorCommissionStatus({
      id: c._id,
      status: nextStatus,
      settlementDate: nextStatus === 'Paid' ? (c.settlementDate || today()) : undefined
    })).unwrap().catch(() => {});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this commission entry?')) return;
    await dispatch(deleteVendorCommission(id)).unwrap().catch(() => {});
  };

  const pendingTotal = commissions.filter(c => c.status === 'Pending').reduce((a, c) => a + c.calculatedAmount, 0);
  const paidTotal = commissions.filter(c => c.status === 'Paid').reduce((a, c) => a + c.calculatedAmount, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
          <div className="min-w-[200px] flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
            <select value={selVendor} onChange={e => setSelVendor(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="">All Vendors</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.name} — {v.vendorCode}</option>)}
            </select>
          </div>

          {/* Settlement Date Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Settlement Date Filter</label>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
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
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {['All', 'Pending', 'Paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 rounded-2xl p-4"><p className="text-xs text-amber-600">Pending Commission</p><p className="text-xl font-bold text-amber-700">₹{pendingTotal.toLocaleString('en-IN')}</p></div>
        <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-xs text-emerald-600">Paid Commission</p><p className="text-xl font-bold text-emerald-700">₹{paidTotal.toLocaleString('en-IN')}</p></div>
      </div>

      {vendor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Add Commission Entry — {vendor.name}</h3>
          {error && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Field label="Commission Type">
              <select value={entry.commissionType} onChange={e => setEntry(f => ({ ...f, commissionType: e.target.value }))} className={inputCls}>
                {COMMISSION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Month">
              <select value={entry.month} onChange={e => setEntry(f => ({ ...f, month: e.target.value }))} className={inputCls}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <input type="number" value={entry.year} onChange={e => setEntry(f => ({ ...f, year: e.target.value }))} className={inputCls} />
            </Field>
            <Field label={entry.commissionType === 'Percentage' ? 'Rate (%)' : 'Rate (₹)'}>
              <input type="number" value={entry.rate} onChange={e => setEntry(f => ({ ...f, rate: e.target.value }))} className={inputCls} />
            </Field>
            {entry.commissionType === 'Percentage' && (
              <Field label="Base Amount (₹)">
                <input type="number" value={entry.baseAmount} onChange={e => setEntry(f => ({ ...f, baseAmount: e.target.value }))} className={inputCls} placeholder="Freight/invoice value" />
              </Field>
            )}
            {entry.commissionType === 'Per Load' && (
              <Field label="No. of Loads">
                <input type="number" value={entry.loadCount} onChange={e => setEntry(f => ({ ...f, loadCount: e.target.value }))} className={inputCls} />
              </Field>
            )}
            <Field label="Settlement Date">
              <input type="date" value={entry.settlementDate} onChange={e => setEntry(f => ({ ...f, settlementDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Notes">
              <input value={entry.notes} onChange={e => setEntry(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Optional" />
            </Field>
          </div>
          <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add Entry'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-emerald-50 rounded-xl p-2.5"><Wallet className="w-5 h-5 text-emerald-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Commission Settlement</h2>
            <p className="text-xs text-gray-400">Mark entries as Paid with their respective settlement dates</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Vendor', 'Type', 'Period', 'Amount', 'Settlement Date', 'Status', 'Action'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No commission entries match filter.</td></tr>}
              {filtered.map(c => {
                const sDate = c.settlementDate
                  ? new Date(c.settlementDate).toLocaleDateString('en-IN')
                  : (c.paidAt ? new Date(c.paidAt).toLocaleDateString('en-IN') : '—');
                return (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{c.vendorName} <span className="text-xs text-gray-400 font-mono">({c.vendorCode})</span></td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{c.commissionType}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{c.month && c.year ? `${MONTHS[c.month - 1]} ${c.year}` : '—'}</td>
                    <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{c.calculatedAmount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-emerald-700 font-medium whitespace-nowrap text-xs">{sDate}</td>
                    <td className="px-5 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[c.status]}`}>{c.status}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStatus(c)} title={c.status === 'Paid' ? 'Mark as Pending' : 'Mark as Paid'}
                          className={c.status === 'Paid' ? 'text-gray-400 hover:text-gray-600' : 'text-emerald-500 hover:text-emerald-700'}>
                          {c.status === 'Paid' ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(c._id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
