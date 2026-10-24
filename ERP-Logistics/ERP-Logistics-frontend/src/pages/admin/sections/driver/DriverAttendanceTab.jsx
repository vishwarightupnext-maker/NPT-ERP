import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, ChevronLeft, ChevronRight, Users, X, Search, ArrowLeft } from 'lucide-react';
import { fetchDrivers } from '../../../../store/slices/driversSlice';
import {
  fetchDriverAttendance, upsertDriverAttendance, deleteDriverAttendance,
} from '../../../../store/slices/driverHRSlice';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLE = {
  Present:    { cell: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-700', btn: 'bg-emerald-600 border-emerald-600 text-white' },
  'Half Day': { cell: 'bg-yellow-50 border-yellow-200',   label: 'text-yellow-700',  btn: 'bg-yellow-500 border-yellow-500 text-white' },
  Absent:     { cell: 'bg-red-50 border-red-200',         label: 'text-red-700',    btn: 'bg-red-600 border-red-600 text-white' },
  'On Leave': { cell: 'bg-blue-50 border-blue-200',       label: 'text-blue-700',   btn: 'bg-blue-600 border-blue-600 text-white' },
};

function buildCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysCount = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DriverAttendanceTab() {
  const dispatch = useDispatch();
  const { list: drivers } = useSelector(s => s.drivers);
  const { attendance } = useSelector(s => s.driverHR);

  const now = new Date();
  const [selDriver, setSelDriver] = useState('');
  const [search, setSearch]       = useState('');
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year, setYear]           = useState(now.getFullYear());
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({ status: 'Present', clockIn: '', clockOut: '' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => { dispatch(fetchDrivers()); }, [dispatch]);

  useEffect(() => {
    if (!selDriver) return;
    const pad = String(month).padStart(2, '0');
    dispatch(fetchDriverAttendance({ driverId: selDriver, from: `${year}-${pad}-01`, to: `${year}-${pad}-31` }));
  }, [selDriver, month, year, dispatch]);

  const calCells = useMemo(() => buildCalendar(year, month), [year, month]);
  const recordMap = useMemo(() => { const m = {}; attendance.forEach(r => { m[r.date] = r; }); return m; }, [attendance]);
  const todayStr = new Date().toISOString().split('T')[0];

  const openDay = (day) => {
    if (!day || !selDriver) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr > todayStr) return;
    const rec = recordMap[dateStr];
    setForm({ status: rec?.status || 'Present', clockIn: rec?.clockIn || '', clockOut: rec?.clockOut || '' });
    setModal({ date: dateStr, record: rec });
  };

  const handleSave = async () => {
    setSaving(true);
    await dispatch(upsertDriverAttendance({ driver: selDriver, date: modal.date, ...form })).unwrap().catch(() => {});
    setSaving(false); setModal(null);
    const pad = String(month).padStart(2, '0');
    dispatch(fetchDriverAttendance({ driverId: selDriver, from: `${year}-${pad}-01`, to: `${year}-${pad}-31` }));
  };

  const handleClear = async () => {
    if (!modal.record?._id) { setModal(null); return; }
    await dispatch(deleteDriverAttendance(modal.record._id)).unwrap().catch(() => {});
    setModal(null);
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const present = attendance.filter(r => r.status === 'Present').length;
  const halfDay = attendance.filter(r => r.status === 'Half Day').length;
  const absent  = attendance.filter(r => r.status === 'Absent').length;
  const totalHrs = attendance.reduce((a, r) => a + (r.hoursWorked || 0), 0);

  const selectedDriver = drivers.find(d => d._id === selDriver);
  const filteredDrivers = drivers.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.driverCode?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or code…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
            <select value={selDriver} onChange={e => setSelDriver(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
              <option value="">Select Driver</option>
              {filteredDrivers.map(d => <option key={d._id} value={d._id}>{d.name} — {d.driverCode}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>

      {selDriver ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <button onClick={() => setSelDriver('')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to all drivers
            </button>
            {selectedDriver && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">{selectedDriver.name?.[0]?.toUpperCase()}</div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{selectedDriver.name}</p>
                  <p className="text-xs text-gray-400">{selectedDriver.driverCode}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Present', value: present, color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Half Day', value: halfDay, color: 'text-yellow-700', bg: 'bg-yellow-50' },
              { label: 'Absent', value: absent, color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Total Hours', value: totalHrs.toFixed(1) + 'h', color: 'text-blue-700', bg: 'bg-blue-50' },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-2xl p-4`}>
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" /> {MONTHS[month - 1]} {year}</h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calCells.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="min-h-[58px]" />;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isFuture = dateStr > todayStr;
                const rec = recordMap[dateStr];
                const style = rec ? STATUS_STYLE[rec.status] : null;
                return (
                  <div key={day} onClick={() => !isFuture && openDay(day)}
                    className={`min-h-[58px] p-1.5 border rounded-xl transition-all ${
                      isFuture ? 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                        : `cursor-pointer hover:border-blue-400 hover:shadow-sm ${style ? style.cell : 'bg-white border-gray-100 hover:bg-blue-50/30'}`
                    }`}>
                    <span className={`text-xs font-semibold ${isFuture ? 'text-gray-300' : rec ? style.label : 'text-gray-600'}`}>{day}</span>
                    {rec && (
                      <div className="mt-0.5 space-y-0.5">
                        <span className={`block text-[9px] font-bold leading-none ${style.label}`}>{rec.status}</span>
                        {rec.clockIn && <span className="block text-[8px] text-gray-400 leading-none">{rec.clockIn}{rec.clockOut ? `–${rec.clockOut}` : ''}</span>}
                      </div>
                    )}
                    {!rec && !isFuture && <span className="block text-[9px] text-gray-300 mt-0.5">+ Add</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">Click any past day to add or edit attendance.</p>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="bg-teal-50 rounded-xl p-2.5 shrink-0"><Users className="w-5 h-5 text-teal-700" /></div>
            <div>
              <h2 className="font-bold text-gray-800">All Drivers</h2>
              <p className="text-xs text-gray-400 hidden sm:block">Click a driver to view and manage their attendance</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 shrink-0">{filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4">
            {filteredDrivers.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No drivers found.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDrivers.map(d => (
                <div key={d._id} onClick={() => setSelDriver(d._id)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-teal-300 hover:bg-teal-50/40 cursor-pointer transition-all group">
                  <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 font-bold text-base shrink-0">{d.name?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm group-hover:text-teal-700 transition-colors">{d.name}</p>
                    <p className="text-xs text-gray-400 truncate">{d.driverCode} · {d.phone || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-800 text-sm">{modal.date}</p>
                <p className="text-xs text-gray-400">{new Date(`${modal.date}T00:00:00`).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <button onClick={() => setModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Present', 'Half Day', 'Absent', 'On Leave'].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s, ...(s === 'Absent' || s === 'On Leave' ? { clockIn: '', clockOut: '' } : {}) }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.status === s ? STATUS_STYLE[s].btn : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {form.status !== 'Absent' && form.status !== 'On Leave' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                    <input type="time" value={form.clockIn} onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
                    <input type="time" value={form.clockOut} onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              {modal.record && <button onClick={handleClear} className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition">Clear</button>}
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
