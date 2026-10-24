import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, UserCheck, TrendingUp, Calendar, Clock, Briefcase } from 'lucide-react';
import { fetchHRMStats, fetchAttendance, fetchProjects } from '../../../store/slices/hrmSlice';

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

const BAR_COLORS = ['bg-emerald-500', 'bg-teal-400', 'bg-cyan-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400'];

export default function HRMAnalytics() {
  const dispatch = useDispatch();
  const { stats, attendance, projects, loading } = useSelector(s => s.hrm);

  useEffect(() => {
    dispatch(fetchHRMStats());
    dispatch(fetchAttendance());
    dispatch(fetchProjects());
  }, [dispatch]);

  const s = stats || {};

  // compute department breakdown from employees stats
  const deptEntries = Object.entries(s.departments || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxDept = Math.max(...deptEntries.map(d => d[1]), 1);

  // work format donut data
  const wf = s.workFormat || {};
  const wfTotal = (wf['On Site'] || 0) + (wf['Remote'] || 0) + (wf['Bench'] || 0);

  // turnover chart
  const turnover = s.turnover || [];
  const maxHire = Math.max(...turnover.map(t => t.hired), 1);

  // project status counts
  const projStatus = ['Planning', 'In Progress', 'Completed', 'On Hold'].map(st => ({
    label: st,
    count: projects.filter(p => p.status === st).length,
  }));

  // attendance today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.filter(r => r.date === todayStr);
  const presentToday = todayAtt.filter(r => r.clockIn).length;

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total Employees"  value={s.totalEmployees}  sub={`+${s.newThisMonth || 0} this month`}   color="text-blue-600"    bg="bg-blue-50" />
        <StatCard icon={UserCheck} label="Active Employees" value={s.activeEmployees}  sub={`${wf['Remote'] || 0} remote`}            color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Calendar}  label="Pending Leaves"   value={s.pendingLeaves}    sub="awaiting approval"                        color="text-yellow-600"  bg="bg-yellow-50" />
        <StatCard icon={Clock}     label="Present Today"    value={presentToday}        sub={`of ${todayAtt.length} tracked`}          color="text-purple-600"  bg="bg-purple-50" />
        <StatCard icon={TrendingUp} label="New Last Month"  value={s.newLastMonth}     sub="vs this month"                            color="text-cyan-600"    bg="bg-cyan-50" />
        <StatCard icon={Briefcase} label="Total Projects"   value={projects.length}    sub={`${projects.filter(p => p.status === 'In Progress').length} in progress`} color="text-rose-600" bg="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly hiring bar chart */}
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

        {/* Department breakdown */}
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

        {/* Work format */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Work Format Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'On Site', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
              { key: 'Remote',  color: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50' },
              { key: 'Bench',   color: 'bg-yellow-500',  text: 'text-yellow-700',  bg: 'bg-yellow-50' },
            ].map(({ key, text, bg }) => (
              <div key={key} className={`${bg} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${text}`}>{wf[key] || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{key}</p>
                <p className="text-[10px] text-gray-400">{wfTotal ? Math.round((wf[key] || 0) / wfTotal * 100) : 0}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Project status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Project Status</h2>
          <div className="grid grid-cols-2 gap-4">
            {projStatus.map(({ label, count }) => {
              const colors = {
                'Planning': 'bg-blue-50 text-blue-700',
                'In Progress': 'bg-emerald-50 text-emerald-700',
                'Completed': 'bg-purple-50 text-purple-700',
                'On Hold': 'bg-yellow-50 text-yellow-700',
              };
              return (
                <div key={label} className={`${colors[label]} rounded-xl p-4`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs mt-1">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
