import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, ChevronLeft, ChevronRight, Users, X, Search, ArrowLeft, ExternalLink } from 'lucide-react';
import {
  fetchAttendance, fetchEmployees,
  upsertAttendanceEntry, deleteAttendanceEntry,
} from '../../../store/slices/hrmSlice';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLE = {
  Present:   { cell: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-700', btn: 'bg-emerald-600 border-emerald-600 text-white' },
  'Half Day': { cell: 'bg-yellow-50 border-yellow-200',  label: 'text-yellow-700',  btn: 'bg-yellow-500 border-yellow-500 text-white' },
  Absent:    { cell: 'bg-red-50 border-red-200',         label: 'text-red-700',     btn: 'bg-red-600 border-red-600 text-white' },
};

function buildCalendar(year, month) {
  const firstDay  = new Date(year, month - 1, 1).getDay();
  const daysCount = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function calcHours(ci, co) {
  if (!ci || !co) return 0;
  const [ih, im] = ci.split(':').map(Number);
  const [oh, om] = co.split(':').map(Number);
  return Math.max(0, parseFloat(((oh * 60 + om - ih * 60 - im) / 60).toFixed(2)));
}

export default function AttendanceManagement() {
  const dispatch = useDispatch();
  const { attendance, employees } = useSelector(s => s.hrm);

  const now = new Date();
  const [selEmp, setSelEmp]   = useState('');
  const [search, setSearch]   = useState('');
  const [month,  setMonth]    = useState(now.getMonth() + 1);
  const [year,   setYear]     = useState(now.getFullYear());
  const [modal,  setModal]    = useState(null); // { date, record? }
  const [form,   setForm]     = useState({ status: 'Present', clockIn: '', clockOut: '' });
  const [saving, setSaving]   = useState(false);

  useEffect(() => { dispatch(fetchEmployees({ includeErp: true })); }, [dispatch]);

  useEffect(() => {
    if (!selEmp) return;
    const pad = String(month).padStart(2, '0');
    dispatch(fetchAttendance({ empId: selEmp, from: `${year}-${pad}-01`, to: `${year}-${pad}-31` }));
  }, [selEmp, month, year, dispatch]);

  const calCells = useMemo(() => buildCalendar(year, month), [year, month]);

  const recordMap = useMemo(() => {
    const m = {};
    attendance.forEach(r => { m[r.date] = r; });
    return m;
  }, [attendance]);

  const todayStr = new Date().toISOString().split('T')[0];

  const openDay = (day) => {
    if (!day || !selEmp) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr > todayStr) return;
    const rec = recordMap[dateStr];
    setForm({ status: rec?.status || 'Present', clockIn: rec?.clockIn || '', clockOut: rec?.clockOut || '' });
    setModal({ date: dateStr, record: rec });
  };

  const handleSave = async () => {
    setSaving(true);
    await dispatch(upsertAttendanceEntry({ employee: selEmp, date: modal.date, ...form }));
    setSaving(false);
    setModal(null);
  };

  const handleClear = async () => {
    if (!modal.record?._id) { setModal(null); return; }
    await dispatch(deleteAttendanceEntry(modal.record._id));
    setModal(null);
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const present  = attendance.filter(r => r.status === 'Present').length;
  const halfDay  = attendance.filter(r => r.status === 'Half Day').length;
  const absent   = attendance.filter(r => r.status === 'Absent').length;
  const totalHrs = attendance.reduce((a, r) => a + (r.hoursWorked || 0), 0);

  const selectedEmployee = employees.find(e => e._id === selEmp);
  const filteredEmployees = employees.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, ID, department…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
            <select
              value={selEmp}
              onChange={e => setSelEmp(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Employee</option>
              {filteredEmployees.map(e => (
                <option key={e._id} value={e._id}>{e.name} — {e.employeeId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {selEmp ? (
        <>
          {/* Selected employee header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <button
              onClick={() => setSelEmp('')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to all employees
            </button>
            {selectedEmployee && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                  {selectedEmployee.name?.[0]?.toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{selectedEmployee.name}</p>
                  <p className="text-xs text-gray-400">{selectedEmployee.employeeId} · {selectedEmployee.department || '—'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Present',    value: present,             color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Half Day',   value: halfDay,             color: 'text-yellow-700',  bg: 'bg-yellow-50'  },
              { label: 'Absent',     value: absent,              color: 'text-red-700',     bg: 'bg-red-50'     },
              { label: 'Total Hours',value: totalHrs.toFixed(1)+'h', color: 'text-blue-700', bg: 'bg-blue-50'  },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-2xl p-4`}>
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                {MONTHS[month - 1]} {year}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calCells.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="min-h-[58px]" />;
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isFuture = dateStr > todayStr;
                const rec = recordMap[dateStr];
                const style = rec ? STATUS_STYLE[rec.status] : null;

                return (
                  <div
                    key={day}
                    onClick={() => !isFuture && openDay(day)}
                    className={`min-h-[58px] p-1.5 border rounded-xl transition-all ${
                      isFuture
                        ? 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                        : `cursor-pointer hover:border-emerald-400 hover:shadow-sm ${style ? style.cell : 'bg-white border-gray-100 hover:bg-emerald-50/30'}`
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isFuture ? 'text-gray-300' : rec ? style.label : 'text-gray-600'}`}>
                      {day}
                    </span>
                    {rec && (
                      <div className="mt-0.5 space-y-0.5">
                        <span className={`block text-[9px] font-bold leading-none ${style.label}`}>{rec.status}</span>
                        {rec.clockIn && (
                          <span className="block text-[8px] text-gray-400 leading-none">
                            {rec.clockIn}{rec.clockOut ? `–${rec.clockOut}` : ''}
                          </span>
                        )}
                      </div>
                    )}
                    {!rec && !isFuture && (
                      <span className="block text-[9px] text-gray-300 mt-0.5">+ Add</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-gray-400 mt-3">Click any past day to add or edit attendance.</p>
          </div>

          {/* Monthly table */}
          {attendance.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-sm">Monthly Records — {MONTHS[month - 1]} {year}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      {['Date','Day','Status','Clock In','Clock Out','Hours'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...attendance].sort((a, b) => a.date.localeCompare(b.date)).map(rec => {
                      const s = STATUS_STYLE[rec.status];
                      return (
                        <tr key={rec._id} className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => { setForm({ status: rec.status, clockIn: rec.clockIn||'', clockOut: rec.clockOut||'' }); setModal({ date: rec.date, record: rec }); }}>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{rec.date}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">
                            {new Date(`${rec.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s?.label} ${s?.cell}`}>{rec.status}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-700">{rec.clockIn  || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-700">{rec.clockOut || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{rec.hoursWorked > 0 ? `${rec.hoursWorked}h` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="bg-violet-50 rounded-xl p-2.5 shrink-0"><Users className="w-5 h-5 text-violet-700" /></div>
            <div>
              <h2 className="font-bold text-gray-800">All Employees</h2>
              <p className="text-xs text-gray-400 hidden sm:block">Click an employee to view and manage their attendance</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 shrink-0">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-4">
            {filteredEmployees.length === 0 && (
              <p className="text-center py-12 text-gray-400 text-sm">No employees found.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEmployees.map(emp => (
                <div
                  key={emp._id}
                  onClick={() => setSelEmp(emp._id)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100
                             hover:border-emerald-300 hover:bg-emerald-50/40 cursor-pointer
                             transition-all group"
                >
                  <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center
                                  text-violet-700 font-bold text-base shrink-0">
                    {emp.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm flex items-center gap-1
                                  group-hover:text-emerald-700 transition-colors">
                      {emp.name}
                      <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-emerald-400 shrink-0" />
                    </p>
                    <p className="text-xs text-gray-400 truncate">{emp.employeeId} · {emp.department || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.designation || emp.hrmRole || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day Entry Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-800 text-sm">{modal.date}</p>
                <p className="text-xs text-gray-400">
                  {new Date(`${modal.date}T00:00:00`).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => setModal(null)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Status toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                <div className="flex gap-2">
                  {['Present', 'Half Day', 'Absent'].map(s => (
                    <button
                      key={s}
                      onClick={() => setForm(f => ({ ...f, status: s, ...(s === 'Absent' ? { clockIn: '', clockOut: '' } : {}) }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        form.status === s ? STATUS_STYLE[s].btn : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clock In / Out (hidden for Absent) */}
              {form.status !== 'Absent' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                    <input
                      type="time"
                      value={form.clockIn}
                      onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
                    <input
                      type="time"
                      value={form.clockOut}
                      onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Computed hours preview */}
              {form.status !== 'Absent' && form.clockIn && form.clockOut && (() => {
                const hrs = calcHours(form.clockIn, form.clockOut);
                return hrs > 0 ? (
                  <div className="bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700 font-medium">
                    Hours worked: {hrs} hrs {hrs < 4 ? '(will be marked Half Day)' : ''}
                  </div>
                ) : null;
              })()}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              {modal.record && (
                <button onClick={handleClear}
                  className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition">
                  Clear
                </button>
              )}
              <button onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
