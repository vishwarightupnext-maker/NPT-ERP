import { useState } from 'react';
import { ListChecks, CalendarDays, BarChart3, Building2 } from 'lucide-react';
import OfficeExpenseTrackTab from './OfficeExpenseTrackTab';
import MonthlyExpenseReportTab from './MonthlyExpenseReportTab';
import YearlyExpenseReportTab from './YearlyExpenseReportTab';
import DepartmentExpenseReportTab from './DepartmentExpenseReportTab';

const TABS = [
  { key: 'track',      label: 'Expense Types',            icon: ListChecks },
  { key: 'monthly',    label: 'Monthly Expenses',          icon: CalendarDays },
  { key: 'yearly',     label: 'Yearly Expenses',           icon: BarChart3 },
  { key: 'department', label: 'Department-wise Expenses',  icon: Building2 },
];

const OfficeExpenseHub = () => {
  const [tab, setTab] = useState('track');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
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

      {tab === 'track'      && <OfficeExpenseTrackTab />}
      {tab === 'monthly'    && <MonthlyExpenseReportTab />}
      {tab === 'yearly'     && <YearlyExpenseReportTab />}
      {tab === 'department' && <DepartmentExpenseReportTab />}
    </div>
  );
};

export default OfficeExpenseHub;
