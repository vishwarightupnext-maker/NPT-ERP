import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Download, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { createLetterheadDoc } from '../../../utils/pdf';
import {
  fetchEmployees,
  fetchAttendance,
  fetchPayslips,
  generatePayslip,
  upsertAttendanceEntry,
} from '../../../store/slices/hrmSlice';

const MONTHS    = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];
const SHORT_DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_BG = {
  Present:    'bg-emerald-100 text-emerald-700',
  'Half Day': 'bg-yellow-100 text-yellow-700',
  Absent:     'bg-red-100 text-red-600',
};

const STATUS_OPTS = ['Present', 'Half Day', 'Absent'];
const todayStr = () => new Date().toISOString().split('T')[0];

const mult = s => s === 'Present' ? 1 : s === 'Half Day' ? 0.5 : 0;
const Rs   = n  => `Rs. ${Number(n || 0).toFixed(2)}`;

/* ── PDF generator ───────────────────────────────────────────────────────────── */
async function generatePDF(emp, month, year, workingDays, totals, dailyRate, pf, esi) {
  const totalDeductions = (pf||0) + (esi||0);
  const netSalary        = totals.totalAmount - totalDeductions;

  const ctx = await createLetterheadDoc('PAYSLIP', `${MONTHS[month-1].toUpperCase()} ${year}`);
  const { doc, txt, ML, MR, CW } = ctx;
  let y = ctx.y;

  /* ── employee info row ── */
  doc.setFillColor(234,247,241); doc.rect(ML, y, CW, 6, 'F');
  doc.setFillColor(20,47,32);    doc.rect(ML, y, 3, 6, 'F');
  txt('Employee Details', ML+5, y+4.2, 7.5, true, 'left', [20,47,32]); y += 6.5;
  const C4 = CW/4;
  [
    ['Name',    emp?.name       || '—'],
    ['Emp ID',  emp?.employeeId || '—'],
    ['Dept',    emp?.department || '—'],
    ['Desig.',  emp?.designation || '—'],
  ].forEach(([k,v], i) => {
    doc.setFillColor(i%2===0?250:255, i%2===0?253:255, i%2===0?251:255);
    doc.rect(ML+i*C4, y, C4, 5.5, 'F');
    doc.setDrawColor(215,230,222); doc.setLineWidth(0.2); doc.rect(ML+i*C4, y, C4, 5.5);
    txt(k+':', ML+i*C4+2, y+3.8, 6.5, true,  'left', [100,100,100]);
    txt(String(v), ML+i*C4+14, y+3.8, 7, false, 'left');
  }); y += 7;

  /* ── salary calculation (full width — no day-wise attendance breakdown) ── */
  const RX=ML, RW=CW;
  let rY=y;
  doc.setFillColor(234,247,241); doc.rect(RX,rY,RW,5.5,'F');
  doc.setFillColor(20,47,32);    doc.rect(RX,rY,3, 5.5,'F');
  txt('Salary Calculation', RX+5, rY+4, 7, true, 'left', [20,47,32]); rY += 6;

  const calcRows = [
    ['Working Days',       String(workingDays)],
    ['Present × '+totals.present, Rs(totals.present * dailyRate)],
    ['Half Day × '+totals.halfDay+' × 0.5', Rs(totals.halfDay * dailyRate * 0.5)],
    ['Absent × '+totals.absent,    'Rs. 0.00'],
  ];
  calcRows.forEach((row, i) => {
    const isAbsent = row[0].startsWith('Absent');
    doc.setFillColor(i%2===0?242:255, i%2===0?252:255, i%2===0?246:255);
    doc.rect(RX, rY, RW, 5, 'F');
    doc.setDrawColor(205,228,215); doc.setLineWidth(0.15); doc.rect(RX, rY, RW, 5);
    txt(row[0], RX+3, rY+3.5, 6.5, false, 'left',  isAbsent?[180,50,50]:[40,40,40]);
    txt(row[1], RX+RW-3, rY+3.5, 7,   false, 'right', isAbsent?[180,50,50]:[20,47,32]);
    rY += 5;
  });

  /* gross earned box */
  doc.setFillColor(210,240,222); doc.rect(RX, rY, RW, 6, 'F');
  doc.setDrawColor(150,195,170); doc.setLineWidth(0.3); doc.rect(RX, rY, RW, 6);
  txt('Gross Earned', RX+3, rY+4.2, 7.5, true, 'left',  [20,47,32]);
  txt(Rs(totals.totalAmount), RX+RW-3, rY+4.2, 7.5, true, 'right', [20,47,32]);
  rY += 7;

  /* PF / ESI deduction rows */
  if (totalDeductions > 0) {
    [['Provident Fund (PF)', pf], ['ESI', esi]].filter(d => d[1] > 0).forEach((d, i) => {
      doc.setFillColor(i%2===0?255:255, i%2===0?248:255, i%2===0?248:255);
      doc.rect(RX, rY, RW, 5, 'F');
      doc.setDrawColor(228,205,205); doc.setLineWidth(0.15); doc.rect(RX, rY, RW, 5);
      txt(d[0], RX+3, rY+3.5, 6.5, false, 'left', [180,50,50]);
      txt('− '+Rs(d[1]), RX+RW-3, rY+3.5, 7, false, 'right', [180,50,50]);
      rY += 5;
    });
    doc.setFillColor(255,218,218); doc.rect(RX, rY, RW, 5.5, 'F');
    doc.setDrawColor(195,150,150); doc.setLineWidth(0.3); doc.rect(RX, rY, RW, 5.5);
    txt('Total Deductions', RX+3, rY+4, 7, true, 'left', [180,0,0]);
    txt(Rs(totalDeductions), RX+RW-3, rY+4, 7, true, 'right', [180,0,0]);
    rY += 7;
  }

  /* ── NET SALARY full-width bar ── */
  const bodyEnd = rY + 4;
  doc.setFillColor(20,47,32); doc.rect(ML, bodyEnd, CW, 13, 'F');
  txt('NET SALARY',            ML+5, bodyEnd+9, 13, true, 'left',  [255,255,255]);
  txt(Rs(netSalary),           MR-5, bodyEnd+9, 13, true, 'right', [255,255,255]);

  /* ── wage summary ── */
  const wsY = bodyEnd + 18;
  doc.setFillColor(246,251,248); doc.rect(ML, wsY, CW, 18, 'F');
  doc.setDrawColor(190,220,205); doc.setLineWidth(0.3); doc.rect(ML, wsY, CW, 18);
  doc.setFillColor(20,47,32); doc.rect(ML, wsY, 3, 18, 'F');
  txt('Wage Summary', ML+5, wsY+5.5, 7.5, true, 'left', [20,47,32]);
  const sw = CW/4;
  [
    ['Working Days',  String(workingDays)],
    ['Days Present',  String(totals.present)],
    ['Half Days',     String(totals.halfDay)],
    ['Days Absent',   String(totals.absent)],
  ].forEach(([k,v], i) => {
    txt(k, ML+5+i*sw, wsY+10, 6.5, false, 'left', [90,90,90]);
    txt(v, ML+5+i*sw, wsY+16, 7.5, true,  'left', [20,47,32]);
  });
  txt('This is a system-generated payslip. No signature is required.',
      ctx.PW/2, wsY+23, 7, false, 'center', [160,160,160]);

  doc.save(`Payslip_${emp?.employeeId||'emp'}_${MONTHS[month-1]}_${year}.pdf`);
}

/* ── Component ───────────────────────────────────────────────────────────────── */
export default function EmployeePayslipDetail() {
  const { empId }  = useParams();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { employees, attendance, payslips, loading } = useSelector(s => s.hrm);

  const now = new Date();
  const [month,          setMonth]          = useState(now.getMonth() + 1);
  const [year,           setYear]           = useState(now.getFullYear());
  const [workingDays,    setWorkingDays]    = useState(26);
  const [manualSalary,   setManualSalary]   = useState('');
  const [pf,             setPf]             = useState('');
  const [esi,            setEsi]            = useState('');
  const [publishing,     setPublishing]     = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [error,          setError]          = useState('');

  const EMPTY_ENTRY = { date: todayStr(), status: 'Present', clockIn: '', clockOut: '' };
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm,      setEntryForm]      = useState(EMPTY_ENTRY);
  const [entrySaving,    setEntrySaving]    = useState(false);
  const [entryError,     setEntryError]     = useState('');

  useEffect(() => {
    if (!employees.length) dispatch(fetchEmployees());
  }, [dispatch]);

  const employee = employees.find(e => e._id === empId);

  useEffect(() => {
    const fromDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;
    dispatch(fetchAttendance({ empId, from: fromDate, to: toDate }));
  }, [empId, month, year, dispatch]);

  // Load any payslip already saved for this employee/month/year, so a page
  // refresh doesn't wipe out previously entered salary/PF/ESI/working days.
  useEffect(() => {
    if (empId) dispatch(fetchPayslips({ empId, month, year }));
  }, [empId, month, year, dispatch]);

  useEffect(() => {
    setPublishSuccess(false);
    setError('');
  }, [empId, month, year]);

  useEffect(() => {
    const existing = payslips.find(p => {
      const matchEmp = p.employee === empId || p.employee?._id === empId || String(p.employee) === String(empId);
      return matchEmp && p.month === month && p.year === year;
    });
    if (!existing) return;
    const rate = existing.presentDays > 0 ? existing.basicSalary / existing.presentDays : 0;
    setManualSalary(rate ? String(parseFloat(rate.toFixed(2))) : '');
    setWorkingDays(existing.workingDays || 26);
    setPf(existing.pf ? String(existing.pf) : '');
    setEsi(existing.esi ? String(existing.esi) : '');
    setPublishSuccess(true);
  }, [payslips, empId, month, year]);

  const dailyRate   = parseFloat(manualSalary) || 0;
  const pfAmount    = parseFloat(pf)  || 0;
  const esiAmount   = parseFloat(esi) || 0;
  const monthStr    = `${year}-${String(month).padStart(2,'0')}`;

  const monthAttendance = useMemo(() => {
    return attendance
      .filter(r => {
        const matchEmp   = r.employee === empId ||
                           r.employee?._id === empId ||
                           String(r.employee) === String(empId);
        const matchMonth = r.date?.startsWith(monthStr);
        return matchEmp && matchMonth;
      })
      .sort((a, b) => (a.date||'').localeCompare(b.date||''));
  }, [attendance, empId, monthStr]);

  const totals = useMemo(() => {
    let present = 0, halfDay = 0, absent = 0, totalAmount = 0;
    monthAttendance.forEach(r => {
      if (r.status === 'Present')       { present++;  totalAmount += dailyRate; }
      else if (r.status === 'Half Day') { halfDay++;  totalAmount += dailyRate * 0.5; }
      else                              { absent++; }
    });
    return { present, halfDay, absent, totalAmount };
  }, [monthAttendance, dailyRate]);

  const totalDeductions = pfAmount + esiAmount;
  const netSalary        = Math.max(0, totals.totalAmount - totalDeductions);

  const handlePublish = async () => {
    setPublishing(true); setError('');
    try {
      await dispatch(generatePayslip({
        employeeId:      empId,
        month,
        year,
        workingDays,
        presentDays:     totals.present + totals.halfDay * 0.5,
        basicSalary:     parseFloat(totals.totalAmount.toFixed(2)),
        hra: 0, ta: 0, da: 0, otherAllowances: 0,
        pf: pfAmount, esi: esiAmount, tax: 0, otherDeductions: 0,
      })).unwrap();
      setPublishSuccess(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to save payslip.');
    } finally {
      setPublishing(false);
    }
  };

  const openAddEntry = () => {
    setEntryForm({ ...EMPTY_ENTRY, date: `${year}-${String(month).padStart(2,'0')}-01` });
    setEntryError('');
    setShowEntryModal(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.date) { setEntryError('Select a date.'); return; }
    setEntrySaving(true); setEntryError('');
    try {
      await dispatch(upsertAttendanceEntry({
        employee: empId,
        date:     entryForm.date,
        status:   entryForm.status,
        clockIn:  entryForm.status !== 'Absent' ? entryForm.clockIn  : '',
        clockOut: entryForm.status !== 'Absent' ? entryForm.clockOut : '',
      })).unwrap();
      setShowEntryModal(false);
    } catch (e) {
      setEntryError(typeof e === 'string' ? e : 'Failed to add entry.');
    } finally {
      setEntrySaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Employee header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <button
          onClick={() => navigate('/hrm-dashboard/payslips')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>

        {employee ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center
                            text-violet-700 font-bold text-xl shrink-0">
              {employee.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{employee.name}</h2>
              <p className="text-sm text-gray-400">
                {employee.employeeId} · {employee.department} · {employee.designation || '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Loading employee…</p>
        )}
      </div>

      {/* Month / Year / Salary / Working Days selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm
                       focus:outline-none focus:border-emerald-500">
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm
                       focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Per Day Salary (₹) <span className="text-emerald-600 font-semibold">*</span>
          </label>
          <input
            type="number" min="0" placeholder="e.g. 700"
            value={manualSalary}
            onChange={e => { setManualSalary(e.target.value); setPublishSuccess(false); }}
            className="w-36 border-2 border-emerald-300 rounded-xl px-3 py-2 text-sm font-semibold
                       focus:outline-none focus:border-emerald-600 text-emerald-800 bg-emerald-50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Working Days / Month</label>
          <input type="number" value={workingDays} min="1" max="31"
            onChange={e => { setWorkingDays(Number(e.target.value)); setPublishSuccess(false); }}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm
                       focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Total Salary</p>
          <p className="text-xl font-bold text-emerald-700">
            ₹{totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400">
            for {totals.present + totals.halfDay * 0.5} day{(totals.present + totals.halfDay * 0.5) !== 1 ? 's' : ''} worked
          </p>
        </div>
      </div>

      {/* Attendance summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Present',   totals.present,          'bg-emerald-50', 'text-emerald-700'],
          ['Half Day',  totals.halfDay,           'bg-yellow-50',  'text-yellow-600'],
          ['Absent',    totals.absent,            'bg-red-50',     'text-red-600'],
          ['Total Records', monthAttendance.length,'bg-gray-50',   'text-gray-700'],
        ].map(([label, val, bg, tc]) => (
          <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${tc}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Day-wise attendance table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">
            {MONTHS[month-1]} {year} — Clock-in Attendance
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{monthAttendance.length} records</span>
            <button onClick={openAddEntry}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </button>
          </div>
        </div>

        {monthAttendance.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '620px' }}>
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Day</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Clock In</th>
                  <th className="px-4 py-3 text-right font-medium">Clock Out</th>
                  <th className="px-4 py-3 text-right font-medium">Hours</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthAttendance.map(r => {
                  const [,mo,da] = (r.date||'').split('-');
                  const disp  = da&&mo ? `${da}/${mo}/${year}` : (r.date||'—');
                  const dayN  = r.date ? SHORT_DAY[new Date(`${r.date}T00:00:00`).getDay()] : '—';
                  const amount = dailyRate * mult(r.status);
                  return (
                    <tr key={r._id} className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setEntryForm({ date: r.date, status: r.status, clockIn: r.clockIn || '', clockOut: r.clockOut || '' });
                        setEntryError('');
                        setShowEntryModal(true);
                      }}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{disp}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{dayN}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BG[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-gray-500">
                        {r.clockIn || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-gray-500">
                        {r.clockOut || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-gray-500">
                        {r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : '—'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        r.status === 'Absent' ? 'text-red-400' : 'text-emerald-700'
                      }`}>
                        {Rs(amount)}
                      </td>
                    </tr>
                  );
                })}

                {/* Total row */}
                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                  <td className="px-4 py-3 text-xs font-bold text-emerald-800" colSpan={3}>
                    TOTAL — {totals.present}P · {totals.halfDay}H · {totals.absent}A
                  </td>
                  <td colSpan={3} />
                  <td className="px-4 py-3 text-right text-base font-extrabold text-emerald-800">
                    {Rs(totals.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary calculation summary + actions */}
      {monthAttendance.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

          {/* Breakdown */}
          <h3 className="font-semibold text-gray-800 text-sm">Salary Calculation</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Present × {totals.present} day{totals.present !== 1 ? 's' : ''} × 1</span>
              <span className="font-semibold text-emerald-700">
                {Rs(totals.present * dailyRate)}
              </span>
            </div>
            {totals.halfDay > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Half Day × {totals.halfDay} × 0.5</span>
                <span className="font-semibold text-yellow-600">
                  {Rs(totals.halfDay * dailyRate * 0.5)}
                </span>
              </div>
            )}
            {totals.absent > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Absent × {totals.absent} day{totals.absent !== 1 ? 's' : ''} × 0</span>
                <span className="font-semibold">Rs. 0.00</span>
              </div>
            )}
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between font-semibold text-gray-700">
              <span>Gross Earned</span>
              <span>{Rs(totals.totalAmount)}</span>
            </div>
          </div>

          {/* PF / ESI deduction inputs */}
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Deductions</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">PF (₹)</label>
                <input
                  type="number" min="0" placeholder="0"
                  value={pf}
                  onChange={e => { setPf(e.target.value); setPublishSuccess(false); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right
                             focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">ESI (₹)</label>
                <input
                  type="number" min="0" placeholder="0"
                  value={esi}
                  onChange={e => { setEsi(e.target.value); setPublishSuccess(false); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right
                             focus:outline-none focus:border-red-400" />
              </div>
            </div>
            {totalDeductions > 0 && (
              <div className="flex justify-between text-red-500 text-sm mt-2 font-medium">
                <span>Total Deductions</span>
                <span>− {Rs(totalDeductions)}</span>
              </div>
            )}
          </div>

          {/* Net salary banner */}
          <div className="bg-emerald-900 rounded-2xl px-6 py-5 flex justify-between items-center">
            <div>
              <p className="text-emerald-300 text-xs font-medium tracking-wide uppercase">Net Salary</p>
              <p className="text-emerald-100 text-xs mt-0.5">{MONTHS[month-1]} {year}</p>
            </div>
            <p className="text-white text-3xl font-bold">{Rs(netSalary)}</p>
          </div>

          {dailyRate === 0 && (
            <div className="flex items-start gap-2 text-orange-600 bg-orange-50 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Enter the per day salary above to calculate the net pay.</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {publishSuccess && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Payslip saved to employee account. They can now view it in My Payslips.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => generatePDF(employee, month, year, workingDays, totals, dailyRate, pfAmount, esiAmount)}
              className="flex-1 flex items-center justify-center gap-2 border border-emerald-200
                         text-emerald-700 hover:bg-emerald-50 text-sm font-medium py-3 rounded-xl
                         transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || publishSuccess || dailyRate === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              {publishing ? 'Saving…' : publishSuccess ? 'Saved to Account ✓' : 'Save to Employee Account'}
            </button>
          </div>
        </div>
      )}

      {!loading && monthAttendance.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-5xl mb-3">📅</p>
          <p className="text-gray-500 font-medium">
            No clock-in records for {MONTHS[month-1]} {year}
          </p>
          <p className="text-gray-300 text-sm mt-1 mb-4">
            Attendance recorded via the Time Tracker will appear here automatically,
            or add a day manually below.
          </p>
          <button onClick={openAddEntry}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      )}

      {/* Add / Edit Entry modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-800 text-sm">Add / Edit Attendance</p>
              <button onClick={() => setShowEntryModal(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {entryError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{entryError}</p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={entryForm.date} max={todayStr()}
                  onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                <div className="flex gap-2">
                  {STATUS_OPTS.map(s => (
                    <button key={s} type="button"
                      onClick={() => setEntryForm(f => ({ ...f, status: s, ...(s === 'Absent' ? { clockIn: '', clockOut: '' } : {}) }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        entryForm.status === s
                          ? s === 'Present'  ? 'bg-emerald-600 text-white border-emerald-600'
                          : s === 'Half Day' ? 'bg-yellow-500 text-white border-yellow-500'
                          :                    'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {entryForm.status !== 'Absent' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                    <input type="time" value={entryForm.clockIn}
                      onChange={e => setEntryForm(f => ({ ...f, clockIn: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
                    <input type="time" value={entryForm.clockOut}
                      onChange={e => setEntryForm(f => ({ ...f, clockOut: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowEntryModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveEntry} disabled={entrySaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
                {entrySaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
