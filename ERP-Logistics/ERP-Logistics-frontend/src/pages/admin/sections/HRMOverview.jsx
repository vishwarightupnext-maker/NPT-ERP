import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, Calendar, UserPlus, TrendingUp, Smile,
  Clock, CreditCard, ChevronRight, UserCheck, Briefcase,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchHRMStats, fetchTodayAttendance, fetchMyAttendance,
  fetchPayslips, fetchMyDailyPay, fetchAttendance, fetchProjects,
} from '../../../store/slices/hrmSlice';
import { useHRMAuth } from '../../../context/HRMAuthContext';

const BAR_COLORS = ['bg-emerald-500', 'bg-teal-400', 'bg-cyan-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400'];

/* ── tiny SVG donut ─── */
const DonutChart = ({ segments, total }) => {
  const R = 44, CX = 60, CY = 60;
  const circ = 2 * Math.PI * R;
  const COLORS = ['#059669', '#0891b2', '#94a3b8'];
  let offset = 0;
  const paths = segments.map(({ value }, i) => {
    const pct  = total ? value / total : 0;
    const dash = circ * pct;
    const el   = ( 
      <circle key={i} cx={CX} cy={CY} r={R}
        fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="14"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-(offset - circ / 4)}
        style={{ transition: 'stroke-dasharray .5s' }}
      />
    );
    offset += dash;
    return el;
  });
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      {total === 0
        ? <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        : paths}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="sans-serif">Total</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#111827" fontFamily="sans-serif">{total}</text>
    </svg>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div className={`${bg} rounded-2xl p-5 flex items-start gap-4`}>
    <div className={`${color} bg-white rounded-xl p-2.5 shadow-sm`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const MONTHS_FULL  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];


/* ════════════════════════════════════════
 * EMPLOYEE SELF-SERVICE DASHBOARD
 * ════════════════════════════════════════ */
const Rs = n => `Rs. ${Number(n || 0).toFixed(2)}`;

const EmployeeDashboard = () => {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const { employee } = useHRMAuth();
  const { myDailyPay, loading } = useSelector(s => s.hrm);

  const empId = employee?._id || employee?.id;

  useEffect(() => {
    dispatch(fetchTodayAttendance());
    dispatch(fetchMyAttendance());
    if (empId) {
      dispatch(fetchPayslips({ empId }));
      dispatch(fetchMyDailyPay());
    }
  }, [dispatch, empId]);

  /* Group daily-pay entries by month+year, compute totals per group */
  const dailyPayGroups = useMemo(() => {
    const groups = {};
    myDailyPay.forEach(entry => {
      const key = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          key, month: entry.month, year: entry.year,
          employeeName: entry.employeeName,
          entries: [], totalAmount: 0, present: 0, halfDay: 0, absent: 0,
        };
      }
      groups[key].entries.push(entry);
      groups[key].totalAmount += entry.amount || 0;
      if (entry.status === 'Present')       groups[key].present++;
      else if (entry.status === 'Half Day') groups[key].halfDay++;
      else                                  groups[key].absent++;
    });
    return Object.values(groups).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [myDailyPay]);

  const quickLinks = [
    { label: 'Time Tracker', sub: 'Clock In / Out',  icon: Clock,      path: '/hrm-dashboard/time-tracker', color: 'emerald' },
    { label: 'My Payslips',  sub: 'View & download', icon: CreditCard, path: '/hrm-dashboard/my-payslips',  color: 'violet'  },
    { label: 'Apply Leave',  sub: 'Leave requests',  icon: Calendar,   path: '/hrm-dashboard/leaves',        color: 'blue'    },
  ];
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    violet:  'bg-violet-50 text-violet-600',
    blue:    'bg-blue-50 text-blue-600',
  };

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 sm:p-6 text-white">
        <p className="text-emerald-100 text-xs mb-1">Welcome back</p>
        <h2 className="text-xl sm:text-2xl font-bold">{employee?.name}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="bg-white/20 rounded-lg px-3 py-1 text-xs font-medium">{employee?.employeeId}</span>
          <span className="bg-white/20 rounded-lg px-3 py-1 text-xs font-medium">{employee?.department}</span>
          <span className="bg-white/20 rounded-lg px-3 py-1 text-xs font-medium">{employee?.hrmRole}</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickLinks.map(({ label, sub, icon: Icon, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left group"
          >
            <div className={`rounded-xl p-2.5 ${colorMap[color]} shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const { stats, attendance, projects, loading } = useSelector(s => s.hrm);

  useEffect(() => {
    dispatch(fetchHRMStats());
    dispatch(fetchAttendance());
    dispatch(fetchProjects());
  }, [dispatch]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = stats;
  const wf = s.workFormat || {};
  const wfTotal = (wf['On Site'] || 0) + (wf['Remote'] || 0) + (wf['Bench'] || 0);

  const deptEntries = Object.entries(s.departments || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxDept = Math.max(...deptEntries.map(d => d[1]), 1);

  const turnover = s.turnover || [];
  const maxHire  = Math.max(...turnover.map(t => t.hired), 1);

  const todayStr  = new Date().toISOString().split('T')[0];
  const todayAtt  = attendance.filter(r => r.date === todayStr);
  const presentToday = todayAtt.filter(r => r.clockIn).length;

  const projStatus = ['Planning', 'In Progress', 'Completed', 'On Hold'].map(st => ({
    label: st,
    count: projects.filter(p => p.status === st).length,
  }));
  const projStatusColor = {
    'Planning':    'bg-blue-50 text-blue-700',
    'In Progress': 'bg-emerald-50 text-emerald-700',
    'Completed':   'bg-purple-50 text-purple-700',
    'On Hold':     'bg-yellow-50 text-yellow-700',
  };

  const wfSegments = [
    { label: 'On Site', value: wf['On Site'] || 0 },
    { label: 'Remote',  value: wf['Remote']  || 0 },
    { label: 'Bench',   value: wf['Bench']   || 0 },
  ];

  const empTypeColor = {
    'Full-Time': 'bg-emerald-100 text-emerald-700',
    'Part-Time': 'bg-blue-100 text-blue-700',
    'Contract':  'bg-amber-100 text-amber-700',
    'Intern':    'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">HRM Dashboard</h2>
        <p className="text-xs text-gray-400 mt-0.5">Monitor employee progress, leaves, recruitment, and analytics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Employees"  value={s.totalEmployees}  sub={`+${s.newThisMonth || 0} this month`}           color="text-blue-600"    bg="bg-blue-50" />
        <StatCard icon={UserCheck}  label="Active Employees" value={s.activeEmployees}  sub={`${wf['Remote'] || 0} remote`}                   color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Calendar}   label="Pending Leaves"   value={s.pendingLeaves}    sub="awaiting approval"                               color="text-yellow-600"  bg="bg-yellow-50" />
        <StatCard icon={Clock}      label="Present Today"    value={presentToday}        sub={`of ${todayAtt.length} tracked`}                 color="text-purple-600"  bg="bg-purple-50" />
        <StatCard icon={TrendingUp} label="New Last Month"   value={s.newLastMonth}     sub="vs this month"                                   color="text-cyan-600"    bg="bg-cyan-50" />
        <StatCard icon={Briefcase}  label="Total Projects"   value={projects.length}    sub={`${projects.filter(p => p.status === 'In Progress').length} in progress`} color="text-rose-600" bg="bg-rose-50" />
        <StatCard icon={UserPlus}   label="New This Month"   value={s.newThisMonth}     sub={`vs ${s.newLastMonth || 0} last month`}           color="text-violet-600"  bg="bg-violet-50" />
        <StatCard icon={Smile}      label="Active Rate"
          value={`${s.totalEmployees ? Math.round((s.activeEmployees / s.totalEmployees) * 100) : 0}%`}
          sub="of total employees"                                                                                                              color="text-amber-600"   bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Hiring Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Monthly Hires (Last 6 Months)</h2>
          {turnover.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {turnover.map((t, i) => (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{t.hired}</span>
                  <div
                    className={`w-full rounded-t-lg ${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                    style={{ height: `${Math.max(4, (t.hired / maxHire) * 120)}px` }}
                  />
                  <span className="text-[10px] text-gray-400">{t.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Department Breakdown</h2>
          <div className="space-y-3">
            {deptEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No departments found</p>
            ) : deptEntries.map(([dept, count], i) => (
              <div key={dept}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{dept}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    style={{ width: `${(count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Work Format Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Work Format Distribution</h2>
          <div className="flex items-center gap-6">
            <DonutChart segments={wfSegments} total={wfTotal} />
            <div className="flex-1 grid grid-cols-3 gap-4">
              {[
                { key: 'On Site', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                { key: 'Remote',  text: 'text-blue-700',    bg: 'bg-blue-50' },
                { key: 'Bench',   text: 'text-yellow-700',  bg: 'bg-yellow-50' },
              ].map(({ key, text, bg }) => (
                <div key={key} className={`${bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${text}`}>{wf[key] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{key}</p>
                  <p className="text-[10px] text-gray-400">{wfTotal ? Math.round((wf[key] || 0) / wfTotal * 100) : 0}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Project Status</h2>
          <div className="grid grid-cols-2 gap-4">
            {projStatus.map(({ label, count }) => (
              <div key={label} className={`${projStatusColor[label]} rounded-xl p-4`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recruitment Progress Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">Recruitment Progress</h3>
        </div>
        {!s.recentEmployees?.length ? (
          <p className="text-center text-sm text-gray-400 py-8">No employees yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-emerald-600">
                <tr>
                  {['Full Name', 'Department', 'Type'].map(h =>
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-white whitespace-nowrap">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(s.recentEmployees || []).map(e => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                          {e.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 whitespace-nowrap">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.department}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${empTypeColor[e.employmentType] || 'bg-gray-100 text-gray-600'}`}>
                        {e.employmentType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
 * ROOT — role-based router
 * ════════════════════════════════════════ */
const HRMOverview = () => {
  const { employee } = useHRMAuth();
  return employee?.hrmRole === 'superadmin'
    ? <SuperAdminDashboard />
    : <EmployeeDashboard />;
};

export default HRMOverview;
