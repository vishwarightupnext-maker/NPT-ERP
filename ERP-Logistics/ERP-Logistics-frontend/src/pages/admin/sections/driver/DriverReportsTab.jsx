import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileBarChart, Download, FileDown } from 'lucide-react';
import { fetchDrivers, fetchComplianceAlerts } from '../../../../store/slices/driversSlice';
import { fetchDispatches } from '../../../../store/slices/dispatchSlice';
import { fetchDriverAttendance, fetchDriverPayslips } from '../../../../store/slices/driverHRSlice';
import { createLetterheadDoc, drawTable } from '../../../../utils/pdf';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();

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

// Generic report PDF: letterhead + a paginated table built from the same
// {label, key, width, align} column spec used to build the on-screen data.
async function downloadReportPDF(filename, title, subtitle, columns, rows) {
  const ctx = await createLetterheadDoc(title, subtitle);
  drawTable(ctx, ctx.y, columns, rows.map(r => columns.map(c => r[c.key])));
  ctx.doc.save(filename);
}

const ReportCard = ({ name, desc, onExportCSV, onExportPDF, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between gap-4 mb-3">
      <div>
        <p className="font-semibold text-gray-800 text-sm">{name}</p>
        <p className="text-gray-400 text-xs mt-1">{desc}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onExportPDF} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 rounded-xl px-3 py-2 text-xs font-medium transition">
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
        <button onClick={onExportCSV} className="flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-600 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>
    </div>
    {children}
  </div>
);

export default function DriverReportsTab() {
  const dispatch = useDispatch();
  const { list: drivers, complianceAlerts } = useSelector(s => s.drivers);
  const { list: allDispatches } = useSelector(s => s.dispatches);
  const { attendance, payslips } = useSelector(s => s.driverHR);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selDriver, setSelDriver] = useState(''); // '' = all drivers

  useEffect(() => {
    dispatch(fetchDrivers());
    dispatch(fetchComplianceAlerts());
    dispatch(fetchDispatches());
  }, [dispatch]);

  useEffect(() => {
    const pad = String(month).padStart(2, '0');
    dispatch(fetchDriverAttendance({ driverId: selDriver || undefined, from: `${year}-${pad}-01`, to: `${year}-${pad}-31` }));
    dispatch(fetchDriverPayslips({ driverId: selDriver || undefined, month, year }));
  }, [month, year, selDriver, dispatch]);

  const selectedDriver = drivers.find(d => d._id === selDriver);

  // Scope drivers / trips / alerts to the selected driver when one is picked.
  const scopedDrivers = selDriver ? drivers.filter(d => d._id === selDriver) : drivers;
  const dispatches = selectedDriver ? allDispatches.filter(t => t.driver === selectedDriver.name) : allDispatches;
  const scopedAlerts = selDriver ? complianceAlerts.filter(a => a.driverId === selDriver) : complianceAlerts;
  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const scopeLabel = selectedDriver ? `${selectedDriver.name} (${selectedDriver.driverCode})` : 'All Drivers';

  const attendanceByDriver = useMemo(() => {
    const m = {};
    attendance.forEach(r => {
      m[r.driverCode] ||= { name: r.driverName, code: r.driverCode, present: 0, halfDay: 0, absent: 0, onLeave: 0 };
      if (r.status === 'Present') m[r.driverCode].present++;
      else if (r.status === 'Half Day') m[r.driverCode].halfDay++;
      else if (r.status === 'Absent') m[r.driverCode].absent++;
      else if (r.status === 'On Leave') m[r.driverCode].onLeave++;
    });
    return Object.values(m);
  }, [attendance]);

  const tripsByDriver = useMemo(() => {
    const m = {};
    dispatches.forEach(t => {
      m[t.driver] ||= { driver: t.driver, total: 0, delivered: 0, distance: 0 };
      m[t.driver].total++;
      if (t.status === 'Delivered') { m[t.driver].delivered++; m[t.driver].distance += (t.distance || 0); }
    });
    return Object.values(m);
  }, [dispatches]);

  const masterCols = [
    { key: 'DriverCode', label: 'Code', width: 20 }, { key: 'Name', label: 'Name', width: 32 },
    { key: 'Phone', label: 'Phone', width: 22 }, { key: 'LicenseNo', label: 'License No.', width: 30 },
    { key: 'DriverStatus', label: 'Status', width: 20 }, { key: 'ApprovalStatus', label: 'Approval', width: 20 },
    { key: 'Salary', label: 'Salary', width: 20, align: 'right' },
  ];
  const statusCols = [
    { key: 'DriverCode', label: 'Code', width: 25 }, { key: 'Name', label: 'Name', width: 40 },
    { key: 'DriverStatus', label: 'Driver Status', width: 30 }, { key: 'ApprovalStatus', label: 'Approval', width: 30 },
  ];
  const attendanceCols = [
    { key: 'DriverCode', label: 'Code', width: 22 }, { key: 'Name', label: 'Name', width: 32 },
    { key: 'Present', label: 'Present', width: 18, align: 'right' }, { key: 'HalfDay', label: 'Half Day', width: 18, align: 'right' },
    { key: 'Absent', label: 'Absent', width: 18, align: 'right' }, { key: 'OnLeave', label: 'On Leave', width: 18, align: 'right' },
  ];
  const salaryCols = [
    { key: 'DriverCode', label: 'Code', width: 20 }, { key: 'Name', label: 'Name', width: 30 },
    { key: 'Trips', label: 'Trips', width: 15, align: 'right' }, { key: 'Gross', label: 'Gross', width: 22, align: 'right' },
    { key: 'Deductions', label: 'Deductions', width: 22, align: 'right' }, { key: 'Net', label: 'Net', width: 22, align: 'right' },
    { key: 'Status', label: 'Status', width: 16 },
  ];
  const performanceCols = [
    { key: 'Driver', label: 'Driver', width: 35 }, { key: 'TotalTrips', label: 'Total Trips', width: 25, align: 'right' },
    { key: 'Delivered', label: 'Delivered', width: 25, align: 'right' }, { key: 'DistanceKm', label: 'Distance (km)', width: 25, align: 'right' },
  ];
  const tripCols = [
    { key: 'DispatchNo', label: 'Dispatch No.', width: 22 }, { key: 'Driver', label: 'Driver', width: 24 },
    { key: 'Vehicle', label: 'Vehicle', width: 18 }, { key: 'From', label: 'From', width: 18 }, { key: 'To', label: 'To', width: 18 },
    { key: 'ScheduledDate', label: 'Date', width: 18 }, { key: 'Status', label: 'Status', width: 16 }, { key: 'DistanceKm', label: 'Dist (km)', width: 16, align: 'right' },
  ];
  const expiryCols = [
    { key: 'DriverCode', label: 'Code', width: 20 }, { key: 'Name', label: 'Name', width: 30 },
    { key: 'Document', label: 'Document', width: 35 }, { key: 'Status', label: 'Status', width: 20 }, { key: 'ExpiryDate', label: 'Expiry Date', width: 20 },
  ];

  const masterRows = scopedDrivers.map(d => ({
    DriverCode: d.driverCode, Name: d.name, Phone: d.phone, LicenseNo: d.licenseNo,
    DriverStatus: d.driverStatus, ApprovalStatus: d.status, Salary: d.salary,
  }));
  const statusRows = scopedDrivers.map(d => ({
    DriverCode: d.driverCode, Name: d.name, DriverStatus: d.driverStatus, ApprovalStatus: d.status,
  }));
  const attendanceRows = attendanceByDriver.map(a => ({
    DriverCode: a.code, Name: a.name, Present: a.present, HalfDay: a.halfDay, Absent: a.absent, OnLeave: a.onLeave,
  }));
  const salaryRows = payslips.map(p => ({
    DriverCode: p.driverCode, Name: p.driverName, Trips: p.tripCount, Gross: p.grossSalary, Deductions: p.totalDeductions, Net: p.netSalary, Status: p.status,
  }));
  const performanceRows = tripsByDriver.map(t => ({
    Driver: t.driver, TotalTrips: t.total, Delivered: t.delivered, DistanceKm: t.distance.toFixed(1),
  }));
  const tripRows = dispatches.map(t => ({
    DispatchNo: t.dispatchNo, Driver: t.driver, Vehicle: t.vehicle, From: t.from, To: t.to,
    ScheduledDate: new Date(t.scheduledDate).toLocaleDateString('en-IN'), Status: t.status, DistanceKm: t.distance || 0,
  }));
  const expiryRows = scopedAlerts.map(a => ({
    DriverCode: a.driverCode, Name: a.name, Document: a.docType, Status: a.status,
    ExpiryDate: a.expiryDate ? new Date(a.expiryDate).toLocaleDateString('en-IN') : '',
  }));

  const fileTag = selectedDriver ? `-${selectedDriver.driverCode}` : '';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="bg-red-50 rounded-xl p-2.5"><FileBarChart className="w-5 h-5 text-red-700" /></div>
        <div>
          <h2 className="font-bold text-gray-800">Driver Reports</h2>
          <p className="text-xs text-gray-400">Pick a driver to scope every report to them, or leave as "All Drivers"</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <select value={selDriver} onChange={e => setSelDriver(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-[180px]">
            <option value="">All Drivers</option>
            {drivers.map(d => <option key={d._id} value={d._id}>{d.name} — {d.driverCode}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReportCard name="Driver Master Report" desc={`License, status and contact details — ${scopeLabel}`}
          onExportCSV={() => downloadCSV(`driver-master-report${fileTag}.csv`, masterRows)}
          onExportPDF={() => downloadReportPDF(`driver-master-report${fileTag}.pdf`, 'Driver Master Report', scopeLabel, masterCols, masterRows)}>
          <p className="text-xs text-gray-500">{scopedDrivers.length} driver{scopedDrivers.length !== 1 ? 's' : ''} on record</p>
        </ReportCard>

        <ReportCard name="Active & Inactive Driver Report" desc={`Grouped by operational status — ${scopeLabel}`}
          onExportCSV={() => downloadCSV(`driver-status-report${fileTag}.csv`, statusRows)}
          onExportPDF={() => downloadReportPDF(`driver-status-report${fileTag}.pdf`, 'Active & Inactive Driver Report', scopeLabel, statusCols, statusRows)}>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Active: <b className="text-emerald-700">{scopedDrivers.filter(d => d.driverStatus === 'Active').length}</b></span>
            <span>Inactive: <b className="text-gray-700">{scopedDrivers.filter(d => d.driverStatus === 'Inactive').length}</b></span>
            <span>Suspended: <b className="text-red-700">{scopedDrivers.filter(d => d.driverStatus === 'Suspended').length}</b></span>
          </div>
        </ReportCard>

        <ReportCard name="Driver Attendance Report" desc={`Present/Half Day/Absent/Leave — ${periodLabel} — ${scopeLabel}`}
          onExportCSV={() => downloadCSV(`driver-attendance-${year}-${month}${fileTag}.csv`, attendanceRows)}
          onExportPDF={() => downloadReportPDF(`driver-attendance-${year}-${month}${fileTag}.pdf`, 'Driver Attendance Report', `${periodLabel} — ${scopeLabel}`, attendanceCols, attendanceRows)}>
          <p className="text-xs text-gray-500">{attendanceByDriver.length} driver{attendanceByDriver.length !== 1 ? 's' : ''} with attendance recorded this period</p>
        </ReportCard>

        <ReportCard name="Driver Salary Report" desc={`Payslips generated — ${periodLabel} — ${scopeLabel}`}
          onExportCSV={() => downloadCSV(`driver-salary-${year}-${month}${fileTag}.csv`, salaryRows)}
          onExportPDF={() => downloadReportPDF(`driver-salary-${year}-${month}${fileTag}.pdf`, 'Driver Salary Report', `${periodLabel} — ${scopeLabel}`, salaryCols, salaryRows)}>
          <p className="text-xs text-gray-500">{payslips.length} payslip{payslips.length !== 1 ? 's' : ''} generated this period</p>
        </ReportCard>

        <ReportCard name="Driver Performance Report" desc={`Trips, distance and delivery completion — ${scopeLabel} (all-time)`}
          onExportCSV={() => downloadCSV(`driver-performance-report${fileTag}.csv`, performanceRows)}
          onExportPDF={() => downloadReportPDF(`driver-performance-report${fileTag}.pdf`, 'Driver Performance Report', `All-time — ${scopeLabel}`, performanceCols, performanceRows)}>
          <p className="text-xs text-gray-500">{tripsByDriver.length} driver{tripsByDriver.length !== 1 ? 's' : ''} with trip history</p>
        </ReportCard>

        <ReportCard name="Driver Trip History Report" desc={`Every dispatch with route and status — ${scopeLabel}`}
          onExportCSV={() => downloadCSV(`driver-trip-history${fileTag}.csv`, tripRows)}
          onExportPDF={() => downloadReportPDF(`driver-trip-history${fileTag}.pdf`, 'Driver Trip History Report', scopeLabel, tripCols, tripRows)}>
          <p className="text-xs text-gray-500">{dispatches.length} dispatch record{dispatches.length !== 1 ? 's' : ''}</p>
        </ReportCard>

        <ReportCard name="Driver Document Expiry Report" desc={`Licenses/medical certs expiring or expired — ${scopeLabel}`}
          onExportCSV={() => downloadCSV(`driver-document-expiry${fileTag}.csv`, expiryRows)}
          onExportPDF={() => downloadReportPDF(`driver-document-expiry${fileTag}.pdf`, 'Driver Document Expiry Report', scopeLabel, expiryCols, expiryRows)}>
          <p className="text-xs text-gray-500">{scopedAlerts.length} alert{scopedAlerts.length !== 1 ? 's' : ''} active</p>
        </ReportCard>
      </div>
    </div>
  );
}
