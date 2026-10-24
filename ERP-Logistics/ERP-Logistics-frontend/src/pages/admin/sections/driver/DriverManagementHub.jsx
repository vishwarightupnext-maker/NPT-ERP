import { useEffect, useState } from 'react';
import {
  UserCheck, CalendarClock, Wallet, TrendingUp, FileBarChart, Bell,
} from 'lucide-react';
import AdminDriverManagement from '../AdminDriverManagement';
import DriverAttendanceTab from './DriverAttendanceTab';
import DriverSalaryTab from './DriverSalaryTab';
import DriverPerformanceTab from './DriverPerformanceTab';
import DriverReportsTab from './DriverReportsTab';
import DriverAlertsTab from './DriverAlertsTab';

const TABS = [
  { key: 'drivers',     label: 'Drivers',     icon: UserCheck },
  { key: 'attendance',  label: 'Attendance',  icon: CalendarClock },
  { key: 'salary',      label: 'Salary',      icon: Wallet },
  { key: 'performance', label: 'Performance', icon: TrendingUp },
  { key: 'reports',     label: 'Reports',     icon: FileBarChart },
  { key: 'alerts',      label: 'Notifications', icon: Bell },
];

// Attendance & Salary are Super Admin-only — pass hideTabs={['attendance','salary']}
// from the Admin dashboard route to hide them there while keeping the full
// hub (including those two tabs) available under the Super Admin dashboard.
const DriverManagementHub = ({ hideTabs = [] }) => {
  const visibleTabs = TABS.filter(t => !hideTabs.includes(t.key));
  const [tab, setTab] = useState(visibleTabs[0]?.key || 'drivers');

  useEffect(() => {
    if (!visibleTabs.some(t => t.key === tab)) setTab(visibleTabs[0]?.key || 'drivers');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideTabs.join(',')]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'drivers' && <AdminDriverManagement />}
      {tab === 'attendance' && <DriverAttendanceTab />}
      {tab === 'salary' && <DriverSalaryTab />}
      {tab === 'performance' && <DriverPerformanceTab />}
      {tab === 'reports' && <DriverReportsTab />}
      {tab === 'alerts' && <DriverAlertsTab />}
    </div>
  );
};

export default DriverManagementHub;
