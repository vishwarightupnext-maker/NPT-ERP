import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, Users, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import { fetchDrivers } from '../../../../store/slices/driversSlice';
import { fetchDriverPayslips, generateDriverPayslip, updateDriverPayslipStatus } from '../../../../store/slices/driverHRSlice';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();

const emptyForm = {
  monthlySalary: '', perTripRate: '', incentives: '',
  overtimeHours: '', overtimeRate: '', advanceSalary: '', deductions: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);

export default function DriverSalaryTab() {
  const dispatch = useDispatch();
  const { list: drivers } = useSelector(s => s.drivers);
  const { payslips } = useSelector(s => s.driverHR);

  const [search, setSearch] = useState('');
  const [selDriver, setSelDriver] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { dispatch(fetchDrivers()); }, [dispatch]);
  useEffect(() => { if (selDriver) dispatch(fetchDriverPayslips({ driverId: selDriver })); }, [selDriver, dispatch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedDriver = drivers.find(d => d._id === selDriver);
  const filteredDrivers = drivers.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.driverCode?.toLowerCase().includes(search.toLowerCase()));

  const existing = payslips.find(p => p.month === month && p.year === year);

  useEffect(() => {
    if (existing) {
      setForm({
        monthlySalary: String(existing.monthlySalary || ''), perTripRate: String(existing.perTripRate || ''),
        incentives: String(existing.incentives || ''), overtimeHours: String(existing.overtimeHours || ''),
        overtimeRate: String(existing.overtimeRate || ''), advanceSalary: String(existing.advanceSalary || ''),
        deductions: String(existing.deductions || ''),
      });
    } else {
      setForm(f => ({ ...emptyForm, monthlySalary: selectedDriver?.salary ? String(selectedDriver.salary) : f.monthlySalary }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, selDriver, payslips.length]);

  const handleGenerate = async () => {
    setSaving(true); setError('');
    try {
      await dispatch(generateDriverPayslip({ driverId: selDriver, month, year, ...form })).unwrap();
      dispatch(fetchDriverPayslips({ driverId: selDriver }));
    } catch (err) { setError(err || 'Failed to generate payslip.'); }
    finally { setSaving(false); }
  };

  const markPaid = async (id) => {
    await dispatch(updateDriverPayslipStatus({ id, status: 'Paid' })).unwrap().catch(() => {});
    dispatch(fetchDriverPayslips({ driverId: selDriver }));
  };

  if (!selDriver) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver by name or code…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="bg-emerald-50 rounded-xl p-2.5 shrink-0"><Wallet className="w-5 h-5 text-emerald-700" /></div>
            <div>
              <h2 className="font-bold text-gray-800">Driver Salary Management</h2>
              <p className="text-xs text-gray-400 hidden sm:block">Select a driver to generate or view payslips</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 shrink-0">{filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4">
            {filteredDrivers.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No drivers found.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDrivers.map(d => (
                <div key={d._id} onClick={() => setSelDriver(d._id)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/40 cursor-pointer transition-all group">
                  <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-base shrink-0">{d.name?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm group-hover:text-emerald-700 transition-colors">{d.name}</p>
                    <p className="text-xs text-gray-400 truncate">{d.driverCode}</p>
                  </div>
                  {d.salary > 0 && <p className="text-xs font-semibold text-emerald-700 shrink-0">₹{Number(d.salary).toLocaleString('en-IN')}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <button onClick={() => setSelDriver('')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all drivers
        </button>
        {selectedDriver && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">{selectedDriver.name?.[0]?.toUpperCase()}</div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{selectedDriver.name}</p>
              <p className="text-xs text-gray-400">{selectedDriver.driverCode}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className={`${inputCls} w-auto`}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-24`} />
          {existing && <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${existing.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{existing.status}</span>}
        </div>

        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Monthly Salary (₹)"><input type="number" value={form.monthlySalary} onChange={e => set('monthlySalary', e.target.value)} className={inputCls} /></Field>
          <Field label="Per-Trip Rate (₹)"><input type="number" value={form.perTripRate} onChange={e => set('perTripRate', e.target.value)} className={inputCls} /></Field>
          <Field label="Incentives (₹)"><input type="number" value={form.incentives} onChange={e => set('incentives', e.target.value)} className={inputCls} /></Field>
          <Field label="Overtime Hours"><input type="number" value={form.overtimeHours} onChange={e => set('overtimeHours', e.target.value)} className={inputCls} /></Field>
          <Field label="Overtime Rate (₹/hr)"><input type="number" value={form.overtimeRate} onChange={e => set('overtimeRate', e.target.value)} className={inputCls} /></Field>
          <Field label="Advance Salary (₹)"><input type="number" value={form.advanceSalary} onChange={e => set('advanceSalary', e.target.value)} className={inputCls} /></Field>
          <Field label="Other Deductions (₹)"><input type="number" value={form.deductions} onChange={e => set('deductions', e.target.value)} className={inputCls} /></Field>
        </div>

        {existing && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">Trips Completed</p><p className="font-semibold text-gray-800">{existing.tripCount}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">Gross Salary</p><p className="font-semibold text-gray-800">₹{existing.grossSalary.toLocaleString('en-IN')}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">Total Deductions</p><p className="font-semibold text-red-600">₹{existing.totalDeductions.toLocaleString('en-IN')}</p></div>
            <div className="bg-emerald-50 rounded-xl p-3"><p className="text-xs text-emerald-600">Net Salary</p><p className="font-bold text-emerald-700">₹{existing.netSalary.toLocaleString('en-IN')}</p></div>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={handleGenerate} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
            {saving ? 'Saving…' : existing ? 'Update Payslip' : 'Generate Payslip'}
          </button>
          {existing && existing.status !== 'Paid' && (
            <button onClick={() => markPaid(existing._id)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
              <CheckCircle2 className="w-4 h-4" /> Mark as Paid
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>{['Period', 'Trips', 'Gross', 'Deductions', 'Net', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payslips.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payslips generated yet.</td></tr>}
              {[...payslips].sort((a, b) => b.year - a.year || b.month - a.month).map(p => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{MONTHS[p.month - 1]} {p.year}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.tripCount}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{p.grossSalary.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-red-600">₹{p.totalDeductions.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">₹{p.netSalary.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
