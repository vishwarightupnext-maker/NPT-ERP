import { useState, useEffect } from 'react';
import {
  BarChart3, Truck, Users, Clock, FileText,
  Package, TrendingUp, CheckCircle2, ClipboardList,
} from 'lucide-react';
import api from '../../../api/axios';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatCard = ({ label, value, icon: Icon, bg, text, loading, money }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
    <div className={`inline-flex rounded-xl p-2.5 w-fit ${bg}`}>
      <Icon className={`w-5 h-5 ${text}`} />
    </div>
    <p className="text-2xl font-bold text-gray-800">
      {loading
        ? <span className="inline-block w-16 h-7 bg-gray-100 rounded animate-pulse" />
        : money
          ? `₹${(value ?? 0).toLocaleString('en-IN')}`
          : (value ?? 0)
      }
    </p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

const Analytics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState('dispatches'); // 'dispatches' | 'lrs'

  useEffect(() => {
    api.get('/analytics/metrics')
      .then(r => setMetrics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const m = metrics;

  const topCards = [
    { label: 'Total Users',       value: m?.totalUsers,       icon: Users,        bg: 'bg-blue-50',    text: 'text-blue-700'   },
    { label: 'Active Vehicles',   value: m?.activeVehicles,   icon: Truck,        bg: 'bg-sky-50',     text: 'text-sky-700'    },
    { label: 'Approved Drivers',  value: m?.approvedDrivers,  icon: Users,        bg: 'bg-teal-50',    text: 'text-teal-700'   },
    { label: 'Pending Approvals', value: m?.pendingApprovals, icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-700'  },
  ];

  const bottomCards = [
    { label: 'Total Invoices',   value: m?.totalInvoices,   icon: FileText,      bg: 'bg-violet-50',  text: 'text-violet-700'  },
    { label: 'Paid Invoices',    value: m?.paidInvoices,    icon: CheckCircle2,  bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { label: 'Total LRs',        value: m?.totalLRs,        icon: ClipboardList, bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
    { label: 'Total Dispatches', value: m?.totalDispatches, icon: Package,       bg: 'bg-rose-50',    text: 'text-rose-700'    },
  ];

  const chartData = chartMode === 'dispatches'
    ? (m?.monthlyDispatches ?? Array(12).fill(0))
    : (m?.monthlyLRs        ?? Array(12).fill(0));
  const maxVal = Math.max(...chartData, 1);

  return (
    <div className="space-y-5">

      {/* Row 1 – users / vehicles / drivers / pending */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map(c => <StatCard key={c.label} {...c} loading={loading} />)}
      </div>

      {/* Revenue banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="bg-white/20 rounded-xl p-3 w-fit">
          <TrendingUp className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-sm text-emerald-100">Total Revenue (Paid Invoices)</p>
          <p className="text-3xl font-bold text-white mt-0.5">
            {loading
              ? <span className="inline-block w-28 h-8 bg-white/20 rounded animate-pulse" />
              : `₹${(m?.totalRevenue ?? 0).toLocaleString('en-IN')}`
            }
          </p>
        </div>
        <div className="sm:ml-auto grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Draft',  value: m?.draftInvoices, color: 'text-white/70' },
            { label: 'Sent',   value: m?.sentInvoices,  color: 'text-yellow-200' },
            { label: 'Paid',   value: m?.paidInvoices,  color: 'text-emerald-200' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-xl font-bold ${color}`}>
                {loading ? '—' : (value ?? 0)}
              </p>
              <p className="text-xs text-white/60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 – invoices / LRs / dispatches */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {bottomCards.map(c => <StatCard key={c.label} {...c} loading={loading} />)}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 rounded-xl p-2.5">
              <BarChart3 className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Monthly Activity</h2>
              <p className="text-xs text-gray-400">This year — by month</p>
            </div>
          </div>
          <div className="sm:ml-auto flex bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { key: 'dispatches', label: 'Dispatches' },
              { key: 'lrs',        label: 'LRs' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartMode(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  chartMode === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2 h-44">
          {chartData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {val > 0 && <span className="text-[10px] text-gray-400">{val}</span>}
              <div
                className={`w-full rounded-t-md transition-colors cursor-default ${
                  val > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-100'
                }`}
                style={{ height: `${(val / maxVal) * 100}%`, minHeight: val > 0 ? '6px' : '2px' }}
                title={`${MONTHS[i]}: ${val}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          {MONTHS.map(m => <span key={m}>{m}</span>)}
        </div>
      </div>

    </div>
  );
};

export default Analytics;
