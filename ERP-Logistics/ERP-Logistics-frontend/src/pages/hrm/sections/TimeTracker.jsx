import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  clockIn, clockOut, fetchTodayAttendance, fetchMyAttendance,
  upsertAttendanceEntry, deleteAttendanceEntry,
} from '../../../store/slices/hrmSlice';
import { useHRMAuth } from '../../../context/HRMAuthContext';

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

const statusBadge = s =>
  s === 'Present'  ? 'bg-emerald-100 text-emerald-700' :
  s === 'Half Day' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-red-100 text-red-700';

export default function TimeTracker() {
  const dispatch = useDispatch();
  const { employee } = useHRMAuth();
  const { todayRecord, attendance, loading } = useSelector(s => s.hrm);

  const [clockMsg, setClockMsg] = useState('');
  const [clockErr, setClockErr] = useState('');
  const [now, setNow] = useState(new Date());

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({ status: 'Present', clockIn: '', clockOut: '' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    dispatch(fetchTodayAttendance());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [dispatch]);

  useEffect(() => {
    const pad = String(calMonth).padStart(2, '0');
    dispatch(fetchMyAttendance({ from: `${calYear}-${pad}-01`, to: `${calYear}-${pad}-31` }));
  }, [calMonth, calYear, dispatch]);

  const handleClockIn = async () => {
    setClockMsg(''); setClockErr('');
    const res = await dispatch(clockIn());
    if (clockIn.fulfilled.match(res)) { setClockMsg('Clocked in!'); dispatch(fetchTodayAttendance()); }
    else setClockErr(res.payload || 'Clock-in failed');
  };

  const handleClockOut = async () => {
    setClockMsg(''); setClockErr('');
    const res = await dispatch(clockOut());
    if (clockOut.fulfilled.match(res)) { setClockMsg('Clocked out!'); dispatch(fetchTodayAttendance()); }
    else setClockErr(res.payload || 'Clock-out failed');
  };

  const calCells = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth]);

  const recordMap = useMemo(() => {
    const m = {};
    attendance.forEach(r => { m[r.date] = r; });
    return m;
  }, [attendance]);

  const todayStr = new Date().toISOString().split('T')[0];

  const openDay = (day) => {
    if (!day) return;
    const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if (dateStr > todayStr) return;
    const rec = recordMap[dateStr];
    setForm({ status: rec?.status || 'Present', clockIn: rec?.clockIn || '', clockOut: rec?.clockOut || '' });
    setModal({ date: dateStr, record: rec });
  };

  const handleSave = async () => {
    if (!employee?._id && !employee?.id) return;
    const empId = employee._id || employee.id;
    setSaving(true);
    await dispatch(upsertAttendanceEntry({ employee: empId, date: modal.date, ...form }));
    setSaving(false);
    setModal(null);
  };

  const handleClear = async () => {
    if (!modal.record?._id) { setModal(null); return; }
    await dispatch(deleteAttendanceEntry(modal.record._id));
    setModal(null);
  };

  const prevMonth = () => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const present  = attendance.filter(r => r.status === 'Present').length;
  const halfDay  = attendance.filter(r => r.status === 'Half Day').length;
  const absent   = attendance.filter(r => r.status === 'Absent').length;

  return (
    <div className="space-y-5">
      {/* Live clock + clock-in/out */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1 opacity-80">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{dateStr}</span>
        </div>
        <div className="text-4xl font-bold tracking-widest mb-1">{timeStr}</div>
        <p className="text-emerald-100 text-sm">Welcome, {employee?.name}</p>
      </div>

      {/* Today widget */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Today's Attendance
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Clock In</p>
            <p className="text-xl font-bold text-emerald-700">{todayRecord?.clockIn || '--:--'}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Clock Out</p>
            <p className="text-xl font-bold text-blue-700">{todayRecord?.clockOut || '--:--'}</p>
          </div>
        </div>
        {todayRecord && (
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(todayRecord.status)}`}>
              {todayRecord.status}
            </span>
            {todayRecord.hoursWorked > 0 && (
              <span className="text-sm text-gray-500">{todayRecord.hoursWorked} hrs worked</span>
            )}
          </div>
        )}
        {clockMsg && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{clockMsg}
          </div>
        )}
        {clockErr && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{clockErr}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleClockIn}
            disabled={loading || !!todayRecord?.clockIn}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            <LogIn className="w-4 h-4" /> Clock In
          </button>
          <button onClick={handleClockOut}
            disabled={loading || !todayRecord?.clockIn || !!todayRecord?.clockOut}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Clock Out
          </button>
        </div>
      </div>

      {/* Monthly summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Present</p>
          <p className="text-2xl font-bold text-emerald-700">{present}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Half Day</p>
          <p className="text-2xl font-bold text-yellow-700">{halfDay}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-700">{absent}</p>
        </div>
      </div>

      {/* Attendance Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {MONTHS[calMonth - 1]} {calYear}
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

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {calCells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="min-h-[58px]" />;
            const dStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isFuture = dStr > todayStr;
            const rec = recordMap[dStr];
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
        <p className="text-[11px] text-gray-400 mt-3">Click any past day to add or edit your attendance record.</p>
      </div>

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

              {form.status !== 'Absent' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                    <input type="time" value={form.clockIn}
                      onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
                    <input type="time" value={form.clockOut}
                      onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}

              {form.status !== 'Absent' && form.clockIn && form.clockOut && (() => {
                const hrs = calcHours(form.clockIn, form.clockOut);
                return hrs > 0 ? (
                  <div className="bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700 font-medium">
                    Hours worked: {hrs} hrs {hrs < 4 ? '— will be marked Half Day' : ''}
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
