import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard, Download, Filter } from 'lucide-react';
import { fetchPayslips, fetchMyAttendance, fetchMyDailyPay } from '../../../store/slices/hrmSlice';
import { useHRMAuth } from '../../../context/HRMAuthContext';
import { createLetterheadDoc } from '../../../utils/pdf';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const SHORT_DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const statusColor = {
  Generated: 'bg-blue-100 text-blue-700',
  Paid:      'bg-emerald-100 text-emerald-700',
  Pending:   'bg-yellow-100 text-yellow-700',
};

async function downloadPayslipPDF(ps, attRecords = []) {
  const ctx = await createLetterheadDoc('PAYSLIP', `${MONTHS[(ps.month||1)-1]} ${ps.year}`);
  const { doc, txt, ML, MR, CW } = ctx;
  let y = ctx.y;
  const Rs = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

  // ── Employee Details (compact, 4 cells wide) ────────────────────────────────
  doc.setFillColor(234,247,241); doc.rect(ML, y, CW, 6, 'F');
  doc.setFillColor(20,47,32);    doc.rect(ML, y, 3, 6, 'F');
  txt('Employee Details', ML+5, y+4.2, 7.5, true, 'left', [20,47,32]); y += 6.5;
  const CELL = CW/4;
  [['Name', ps.employeeName||'—'],['Emp ID', ps.employeeId||'—'],['Dept', ps.department||'—'],['Desig.', ps.designation||'—']].forEach(([k,v],i) => {
    doc.setFillColor(i%2===0?250:255, i%2===0?253:255, i%2===0?251:255);
    doc.rect(ML+i*CELL, y, CELL, 5.5, 'F');
    doc.setDrawColor(215,230,222); doc.setLineWidth(0.2); doc.rect(ML+i*CELL, y, CELL, 5.5);
    txt(k+':', ML+i*CELL+2, y+3.8, 6.5, true, 'left', [90,90,90]);
    txt(String(v), ML+i*CELL+14, y+3.8, 7, false, 'left');
  }); y += 5.5;
  [['Working Days', String(ps.workingDays||0)],['Days Present', String(ps.presentDays||0)]].forEach(([k,v],i) => {
    doc.setFillColor(248,252,250); doc.rect(ML+i*CELL, y, CELL, 5, 'F');
    doc.setDrawColor(215,230,222); doc.setLineWidth(0.2); doc.rect(ML+i*CELL, y, CELL, 5);
    txt(k+':', ML+i*CELL+2, y+3.5, 6.5, true, 'left', [90,90,90]);
    txt(v, ML+i*CELL+22, y+3.5, 7.5, true, 'left', [20,47,32]);
  }); y += 6;

  // ── Attendance Summary (totals only — no day-by-day rows) ──────────────────
  const LX=ML, RW0=CW;
  let totH=0,pCnt=0,hCnt=0,aCnt=0;
  attRecords.forEach(r=>{
    totH+=r.hoursWorked||0;
    if(r.status==='Present') pCnt++; else if(r.status==='Half Day') hCnt++; else aCnt++;
  });
  doc.setFillColor(234,247,241); doc.rect(LX,y,RW0,5.5,'F');
  doc.setFillColor(20,47,32);    doc.rect(LX,y,3, 5.5,'F');
  txt('Attendance Summary', LX+5, y+4, 7, true,'left',[20,47,32]); y+=6.5;

  doc.setFillColor(248,252,250); doc.rect(LX,y,RW0,9,'F');
  doc.setDrawColor(215,230,222); doc.setLineWidth(0.2); doc.rect(LX,y,RW0,9);
  const sw0=RW0/4;
  [['Present',String(pCnt)],['Half Day',String(hCnt)],['Absent',String(aCnt)],['Total Hours',`${totH.toFixed(1)}h`]].forEach(([k,v],i)=>{
    txt(k, LX+5+i*sw0, y+4, 6.5,false,'left',[90,90,90]);
    txt(v, LX+5+i*sw0, y+7.5, 8.5,true, 'left',[20,47,32]);
  });
  y += 13;

  // ── Salary Breakdown (full width) ───────────────────────────────────────────
  const RX=ML, RW=CW;
  let rY=y;
  doc.setFillColor(234,247,241); doc.rect(RX,rY,RW,5.5,'F');
  doc.setFillColor(20,47,32);    doc.rect(RX,rY,3, 5.5,'F');
  txt('Salary Breakdown', RX+5, rY+4, 7, true,'left',[20,47,32]); rY+=6;

  doc.setFillColor(20,47,32); doc.rect(RX,rY,RW,5.5,'F');
  txt('EARNINGS', RX+3,rY+4, 7,true,'left', [255,255,255]);
  txt('AMOUNT',   RX+RW-3,rY+4,7,true,'right',[255,255,255]); rY+=5.5;
  [['Basic Salary',ps.basicSalary],['HRA',ps.hra],['Transport (TA)',ps.ta],['DA',ps.da],['Other Allow.',ps.otherAllowances]].forEach((e,i)=>{
    doc.setFillColor(i%2===0?242:255,i%2===0?252:255,i%2===0?246:255);
    doc.rect(RX,rY,RW,5,'F'); doc.setDrawColor(205,228,215); doc.setLineWidth(0.15); doc.rect(RX,rY,RW,5);
    txt(e[0],RX+3,rY+3.5,7,false,'left',[40,40,40]);
    txt(Rs(e[1]),RX+RW-3,rY+3.5,7,false,'right'); rY+=5;
  });
  doc.setFillColor(210,240,222); doc.rect(RX,rY,RW,5.5,'F');
  doc.setDrawColor(150,195,170); doc.setLineWidth(0.3); doc.rect(RX,rY,RW,5.5);
  txt('Gross Salary', RX+3,rY+4,7.5,true,'left',[20,47,32]);
  txt(Rs(ps.grossSalary),RX+RW-3,rY+4,7.5,true,'right',[20,47,32]); rY+=7;

  doc.setFillColor(180,0,0); doc.rect(RX,rY,RW,5.5,'F');
  txt('DEDUCTIONS',RX+3,rY+4,7,true,'left', [255,255,255]);
  txt('AMOUNT',    RX+RW-3,rY+4,7,true,'right',[255,255,255]); rY+=5.5;
  [['Provident Fund (PF)',ps.pf],['ESI',ps.esi],['Income Tax (TDS)',ps.tax],['Other Deductions',ps.otherDeductions]].forEach((d,i)=>{
    doc.setFillColor(i%2===0?255:255,i%2===0?248:255,i%2===0?248:255);
    doc.rect(RX,rY,RW,5,'F'); doc.setDrawColor(228,205,205); doc.setLineWidth(0.15); doc.rect(RX,rY,RW,5);
    txt(d[0],RX+3,rY+3.5,7,false,'left',[40,40,40]);
    txt(Rs(d[1]),RX+RW-3,rY+3.5,7,false,'right'); rY+=5;
  });
  doc.setFillColor(255,218,218); doc.rect(RX,rY,RW,5.5,'F');
  doc.setDrawColor(195,150,150); doc.setLineWidth(0.3); doc.rect(RX,rY,RW,5.5);
  txt('Total Deductions',RX+3,rY+4,7.5,true,'left',[180,0,0]);
  txt(Rs(ps.totalDeductions),RX+RW-3,rY+4,7.5,true,'right',[180,0,0]); rY+=5.5;

  // ── Full-width NET SALARY bar ───────────────────────────────────────────────
  const bodyEnd = rY + 4;
  doc.setFillColor(20,47,32); doc.rect(ML,bodyEnd,CW,12,'F');
  txt('NET SALARY',       ML+5, bodyEnd+8.5, 12, true,'left', [255,255,255]);
  txt(Rs(ps.netSalary),   MR-5, bodyEnd+8.5, 12, true,'right',[255,255,255]);

  // ── Wage Summary box ────────────────────────────────────────────────────────
  const wsY = bodyEnd + 16;
  const dailyRate  = (ps.presentDays||0)>0 ? (Number(ps.basicSalary)||0)/(ps.presentDays||1) : 0;
  const absentDays = (ps.workingDays||0) - (ps.presentDays||0);
  doc.setFillColor(246,251,248); doc.rect(ML,wsY,CW,18,'F');
  doc.setDrawColor(190,220,205); doc.setLineWidth(0.3); doc.rect(ML,wsY,CW,18);
  doc.setFillColor(20,47,32); doc.rect(ML,wsY,3,18,'F');
  txt('Wage Calculation', ML+5, wsY+5.5, 7.5, true,'left',[20,47,32]);
  const sw2=CW/4;
  [['Working Days',String(ps.workingDays||0)],['Days Present',String(ps.presentDays||0)],['Days Absent',String(absentDays)],['Daily Rate',Rs(dailyRate)]].forEach(([k,v],i)=>{
    txt(k, ML+5+i*sw2, wsY+10, 6.5,false,'left',[90,90,90]);
    txt(v, ML+5+i*sw2, wsY+16, 7.5,true, 'left',[20,47,32]);
  });
  txt('This is a system-generated payslip. No signature is required.', ctx.PW/2, wsY+23, 7, false,'center',[160,160,160]);

  doc.save(`Payslip_${ps.employeeId || 'emp'}_${MONTHS[(ps.month || 1) - 1]}_${ps.year}.pdf`);
}

/* ── Daily-pay PDF (day-wise salary system) ─────────────────────────────── */
async function downloadDailyPayPDF(grp, employee) {
  const Rs = n => `Rs. ${Number(n || 0).toFixed(2)}`;
  const ctx = await createLetterheadDoc('PAYSLIP', `${MONTHS[grp.month-1].toUpperCase()} ${grp.year}`);
  const { doc, txt, ML, MR, CW } = ctx;
  let y = ctx.y;

  doc.setFillColor(234,247,241); doc.rect(ML, y, CW, 6, 'F');
  doc.setFillColor(20,47,32);    doc.rect(ML, y, 3, 6, 'F');
  txt('Employee Details', ML+5, y+4.2, 7.5, true, 'left', [20,47,32]); y += 6.5;
  const C4 = CW/4;
  [['Name', employee?.name||'—'], ['Emp ID', employee?.employeeId||'—'],
   ['Dept', employee?.department||'—'], ['Desig.', employee?.designation||'—']].forEach(([k,v],i) => {
    doc.setFillColor(i%2===0?250:255, i%2===0?253:255, i%2===0?251:255);
    doc.rect(ML+i*C4, y, C4, 5.5, 'F');
    doc.setDrawColor(215,230,222); doc.setLineWidth(0.2); doc.rect(ML+i*C4, y, C4, 5.5);
    txt(k+':', ML+i*C4+2, y+3.8, 6.5, true, 'left', [100,100,100]);
    txt(String(v), ML+i*C4+14, y+3.8, 7, false, 'left');
  }); y += 8;

  const COL = [
    { l:'Date', w:26, x:ML }, { l:'Day', w:14, x:ML+26 },
    { l:'Status', w:30, x:ML+40 }, { l:'Daily Rate', w:56, x:ML+70 }, { l:'Amount', w:60, x:ML+126 },
  ];
  doc.setFillColor(20,47,32); doc.rect(ML, y, CW, 6, 'F');
  COL.forEach(c => txt(c.l, c.x+c.w/2, y+4.2, 7, true, 'center', [255,255,255])); y += 6;

  const sorted = [...grp.entries].sort((a,b) => (a.date||'').localeCompare(b.date||''));
  sorted.forEach((e, i) => {
    const [,mo,da] = (e.date||'').split('-');
    const disp = da&&mo ? `${da}/${mo}` : (e.date||'—');
    const dayN = e.date ? SHORT_DAY[new Date(`${e.date}T00:00:00`).getDay()] : '—';
    const sRgb = e.status==='Present' ? [20,100,50] : e.status==='Half Day' ? [150,90,0] : [180,0,0];
    doc.setFillColor(i%2===0?247:255, i%2===0?252:255, i%2===0?249:255);
    doc.rect(ML, y, CW, 5, 'F');
    doc.setDrawColor(220,235,225); doc.setLineWidth(0.1); doc.rect(ML, y, CW, 5);
    txt(disp,            COL[0].x+2,          y+3.5, 7,   false, 'left',  [40,40,40]);
    txt(dayN,            COL[1].x+COL[1].w/2, y+3.5, 6.5, false, 'center',[80,80,80]);
    txt(e.status||'—',   COL[2].x+2,          y+3.5, 7,   true,  'left',  sRgb);
    txt(Rs(e.dailyRate), COL[3].x+COL[3].w-2, y+3.5, 7,   false, 'right', [80,80,80]);
    txt(Rs(e.amount),    COL[4].x+COL[4].w-2, y+3.5, 7.5, true,  'right', [20,47,32]);
    y += 5;
  });

  y += 2;
  doc.setFillColor(20,47,32); doc.rect(ML, y, CW, 7, 'F');
  txt('TOTAL', ML+3, y+4.8, 8, true, 'left', [255,255,255]);
  txt(`${grp.present} Present   ${grp.halfDay} Half Day   ${grp.absent} Absent`,
      COL[2].x+2, y+4.8, 6.5, false, 'left', [180,240,200]);
  txt(Rs(grp.totalAmount), COL[4].x+COL[4].w-2, y+4.8, 9, true, 'right', [255,255,255]); y += 12;

  doc.setFillColor(234,247,241); doc.rect(ML, y, CW, 15, 'F');
  doc.setDrawColor(150,210,175); doc.setLineWidth(0.4); doc.rect(ML, y, CW, 15);
  doc.setFillColor(20,47,32); doc.rect(ML, y, 3, 15, 'F');
  txt('NET SALARY', ML+6, y+6, 9, true, 'left', [20,47,32]);
  txt(`${MONTHS[grp.month-1]} ${grp.year}  ·  ${grp.entries.length} day entries`, ML+6, y+11, 6.5, false, 'left', [100,130,110]);
  txt(Rs(grp.totalAmount), MR-3, y+10, 14, true, 'right', [20,47,32]); y += 21;
  txt('System-generated payslip — no signature required.', ctx.PW/2, y, 7, false, 'center', [180,180,180]);

  doc.save(`Payslip_${employee?.employeeId||'emp'}_${MONTHS[grp.month-1]}_${grp.year}.pdf`);
}

export default function MyPayslips() {
  const dispatch = useDispatch();
  const { employee } = useHRMAuth();
  const { payslips, attendance, myDailyPay, loading } = useSelector(s => s.hrm);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()));

  const empId = employee?._id || employee?.id;

  useEffect(() => {
    if (empId) {
      dispatch(fetchPayslips({ empId }));
      dispatch(fetchMyAttendance());
      dispatch(fetchMyDailyPay());
    }
  }, [dispatch, empId]);

  const applyFilter = () => {
    const params = { empId };
    if (filterMonth) params.month = filterMonth;
    if (filterYear)  params.year  = filterYear;
    dispatch(fetchPayslips(params));
  };

  const resetFilter = () => {
    setFilterMonth(''); setFilterYear(String(now.getFullYear()));
    if (empId) dispatch(fetchPayslips({ empId }));
    dispatch(fetchMyDailyPay());
  };

  /* Traditional payslips filtered */
  const mine = payslips.filter(p => {
    const matchEmp   = p.employee === empId || p.employee?._id === empId || p.employee?.id === empId;
    const matchMonth = !filterMonth || p.month === Number(filterMonth);
    const matchYear  = !filterYear  || p.year  === Number(filterYear);
    return matchEmp && matchMonth && matchYear;
  });

  /* Daily-pay grouped by month/year */
  const dailyPayGroups = useMemo(() => {
    const groups = {};
    myDailyPay.forEach(entry => {
      const key = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = { key, month: entry.month, year: entry.year, entries: [], totalAmount: 0, present: 0, halfDay: 0, absent: 0 };
      }
      groups[key].entries.push(entry);
      groups[key].totalAmount += entry.amount || 0;
      if (entry.status === 'Present')       groups[key].present++;
      else if (entry.status === 'Half Day') groups[key].halfDay++;
      else                                  groups[key].absent++;
    });
    return Object.values(groups).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [myDailyPay]);

  /* Apply month/year filter to daily-pay groups */
  const filteredDailyGroups = dailyPayGroups.filter(grp => {
    const matchMonth = !filterMonth || grp.month === Number(filterMonth);
    const matchYear  = !filterYear  || grp.year  === Number(filterYear);
    return matchMonth && matchYear;
  });

  const handleDownload = (ps) => {
    const monthStr = `${ps.year}-${String(ps.month).padStart(2, '0')}`;
    const monthAtt = attendance.filter(r => r.date?.startsWith(monthStr));
    downloadPayslipPDF(ps, monthAtt);
  };

  const totalCount = mine.length + filteredDailyGroups.length;
  const isEmpty    = totalCount === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-gray-800">My Payslips</h2>
        <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">{totalCount}</span>
      </div>

      {/* Filter row */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Filter payslips by month / year</p>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="flex-1 min-w-[140px] border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white"
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input
            type="number" value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            placeholder="Year" min="2020" max="2099"
            className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button onClick={applyFilter}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Filter className="w-3.5 h-3.5" /> Apply
          </button>
          <button onClick={resetFilter}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5 rounded-xl hover:bg-gray-100 border border-gray-200 transition">
            Reset
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : isEmpty ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">
            {filterMonth || filterYear ? 'No payslip found for the selected period.' : 'No payslips generated yet. Contact HR.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* ── Daily-pay group cards (day-wise salary system) ── */}
          {filteredDailyGroups.map(grp => (
            <div key={grp.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{MONTHS[grp.month - 1]} {grp.year}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{employee?.department}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Generated</span>
              </div>

              {/* Net salary banner */}
              <div className="bg-emerald-900 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-emerald-300 text-[10px] font-medium uppercase tracking-wide">Net Salary</p>
                  <p className="text-emerald-100 text-[10px]">{grp.entries.length} day entries</p>
                </div>
                <p className="text-white text-lg font-bold">Rs. {grp.totalAmount.toFixed(2)}</p>
              </div>

              {/* Attendance breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{grp.present}</p>
                  <p className="text-[10px] text-gray-500">Present</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-yellow-600">{grp.halfDay}</p>
                  <p className="text-[10px] text-gray-500">Half Day</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-red-500">{grp.absent}</p>
                  <p className="text-[10px] text-gray-500">Absent</p>
                </div>
              </div>

              {/* Per-status amount breakdown */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs space-y-1">
                {grp.present > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Present × {grp.present} days</span>
                    <span className="font-medium text-emerald-700">
                      Rs. {grp.entries.filter(e => e.status === 'Present').reduce((s,e) => s + (e.amount||0), 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {grp.halfDay > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Half Day × {grp.halfDay}</span>
                    <span className="font-medium text-yellow-600">
                      Rs. {grp.entries.filter(e => e.status === 'Half Day').reduce((s,e) => s + (e.amount||0), 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {grp.absent > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Absent × {grp.absent} days</span>
                    <span>Rs. 0.00</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-1 flex justify-between font-semibold text-gray-700">
                  <span>Total ({grp.entries.length} days)</span>
                  <span className="text-emerald-700">Rs. {grp.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => downloadDailyPayPDF(grp, employee)}
                className="w-full flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium py-2.5 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          ))}

          {/* ── Traditional payslip cards ── */}
          {mine.map(ps => (
            <div key={ps._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{MONTHS[(ps.month || 1) - 1]} {ps.year}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ps.department}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[ps.status] || 'bg-gray-100 text-gray-600'}`}>
                  {ps.status}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Gross Salary</span>
                  <span className="font-medium text-gray-700">₹{Number(ps.grossSalary||0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Total Deductions</span>
                  <span className="font-medium text-red-600">−₹{Number(ps.totalDeductions||0).toLocaleString('en-IN')}</span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between text-sm font-bold">
                  <span>Net Salary</span>
                  <span className="text-emerald-700">₹{Number(ps.netSalary||0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs space-y-1">
                {[['Basic', ps.basicSalary], ['HRA', ps.hra], ['TA', ps.ta], ['DA', ps.da]].map(([k, v]) =>
                  v > 0 ? <div key={k} className="flex justify-between text-gray-500"><span>{k}</span><span>₹{Number(v).toLocaleString('en-IN')}</span></div> : null
                )}
                <div className="h-px bg-gray-200 my-1" />
                {[['PF', ps.pf], ['ESI', ps.esi], ['Tax', ps.tax]].map(([k, v]) =>
                  v > 0 ? <div key={k} className="flex justify-between text-red-400"><span>{k}</span><span>−₹{Number(v).toLocaleString('en-IN')}</span></div> : null
                )}
              </div>

              <div className="text-xs text-gray-400 mb-3">Present: {ps.presentDays}/{ps.workingDays} days</div>

              <button
                onClick={() => handleDownload(ps)}
                className="w-full flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium py-2.5 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF (with Attendance)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
