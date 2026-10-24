import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Building2, Users, ShieldCheck, Truck, UserCheck,
  HandshakeIcon, BarChart3, FileText, ChevronRight,
  LayoutDashboard, Clock, CheckCircle2, PackageCheck,
  IndianRupee, Wallet, TrendingUp, TrendingDown, Landmark,
  Fuel, ReceiptText,
} from 'lucide-react';

const fmtMoney = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

/* ─── stat card ─────────────────────────────────────── */
const StatCard = ({ label, value, sub, loading, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
    <div className={`rounded-xl p-3 shrink-0 ${color}`}><Icon className="w-5 h-5" /></div>
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-800">
        {loading
          ? <span className="inline-block w-10 h-6 bg-gray-100 rounded animate-pulse" />
          : (value ?? 0)}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

/* ─── sub-link inside a function card ───────────────── */
const SubLink = ({ label, to, icon: Icon, navigate }) => (
  <button
    onClick={() => navigate(to)}
    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-colors text-left group"
  >
    <div className="bg-white rounded-lg p-1.5 shadow-sm shrink-0">
      <Icon className="w-3.5 h-3.5 text-gray-600" />
    </div>
    <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
  </button>
);

/* ─── main function card ─────────────────────────────── */
const FunctionCard = ({ title, desc, accentColor, bgColor, icon: Icon, children }) => (
  <div className={`rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}>
    {/* header */}
    <div className={`${bgColor} px-5 pt-5 pb-4`}>
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-white/70 rounded-xl p-2.5 shadow-sm">
          <Icon className={`w-5 h-5 ${accentColor}`} />
        </div>
        <h3 className="font-bold text-gray-800 text-base">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 ml-0.5">{desc}</p>
    </div>
    {/* sub-links */}
    <div className="bg-gray-50/80 px-3 py-2 space-y-0.5">
      {children}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════ */
const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/metrics')
      .then(r => setMetrics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold mt-0.5">{user?.name || 'Super Admin'}</h2>
          <p className="text-blue-200 text-sm mt-1">Super Admin Portal — New Popular Transport</p>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 hidden sm:block">
          <LayoutDashboard className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* ── Live stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={metrics?.totalUsers} sub="In system" loading={loading} icon={Users} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="Pending Approvals" value={metrics?.pendingApprovals} sub="Needs action" loading={loading} icon={Clock} color="bg-amber-50 text-amber-700" />
        <StatCard label="Active Vehicles" value={metrics?.activeVehicles} sub="Approved" loading={loading} icon={Truck} color="bg-sky-50 text-sky-700" />
        <StatCard label="Approved Drivers" value={metrics?.approvedDrivers} sub="Operational" loading={loading} icon={CheckCircle2} color="bg-green-50 text-green-700" />
      </div>

      {/* ── Dashboard cards ────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Business Overview</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Vehicles" value={metrics?.totalVehicles} sub="All registered" loading={loading} icon={Truck} color="bg-sky-50 text-sky-700" />
        <StatCard label="Active Trips" value={metrics?.activeTrips} sub="In transit" loading={loading} icon={PackageCheck} color="bg-blue-50 text-blue-700" />
        <StatCard label="Pending Trips" value={metrics?.pendingTrips} sub="Awaiting dispatch" loading={loading} icon={Clock} color="bg-amber-50 text-amber-700" />
        <StatCard label="Today's Revenue" value={fmtMoney(metrics?.todaysRevenue)} sub="Paid invoices, today" loading={loading} icon={IndianRupee} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Monthly Revenue" value={fmtMoney(metrics?.monthlyRevenue)} sub="Paid invoices, this month" loading={loading} icon={IndianRupee} color="bg-green-50 text-green-700" />
        <StatCard label="Expenses" value={fmtMoney(metrics?.expenses)} sub="Trip + office, this month" loading={loading} icon={Wallet} color="bg-red-50 text-red-700" />
        <StatCard
          label="Profit"
          value={fmtMoney(metrics?.profit)}
          sub="Monthly revenue − expenses"
          loading={loading}
          icon={(metrics?.profit ?? 0) >= 0 ? TrendingUp : TrendingDown}
          color={(metrics?.profit ?? 0) >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
        />
        <StatCard label="Pending Payments" value={fmtMoney(metrics?.pendingPayments)} sub="Sent / overdue invoices" loading={loading} icon={ReceiptText} color="bg-amber-50 text-amber-700" />
        <StatCard label="Vendor Balance" value={fmtMoney(metrics?.vendorBalance)} sub="Pending commission" loading={loading} icon={Landmark} color="bg-violet-50 text-violet-700" />
        <StatCard label="Diesel Cost" value={fmtMoney(metrics?.dieselCost)} sub="Fleet + vendor, this month" loading={loading} icon={Fuel} color="bg-orange-50 text-orange-700" />
        <StatCard
          label="GST Summary"
          value={fmtMoney(metrics?.gstSummary?.total)}
          sub={`SGST ${fmtMoney(metrics?.gstSummary?.sgst)} · CGST ${fmtMoney(metrics?.gstSummary?.cgst)}`}
          loading={loading}
          icon={ReceiptText}
          color="bg-indigo-50 text-indigo-700"
        />
      </div>

      {/* ── Flow label ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Super Admin Functions</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* ── 4 function cards (matches flowchart branches) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* 1. Company Setup */}
        <FunctionCard
          title="Company Setup"
          desc="Configure company details & structure"
          bgColor="bg-blue-50"
          accentColor="text-blue-700"
          icon={Building2}
        >
          <SubLink label="Configure Company Details" to="/dashboard/company-setup" icon={Building2} navigate={navigate} />
        </FunctionCard>

        {/* 2. User Management */}
        <FunctionCard
          title="User Management"
          desc="Create users & set permissions"
          bgColor="bg-indigo-50"
          accentColor="text-indigo-700"
          icon={Users}
        >
          <SubLink label="Create Users" to="/dashboard/user-management" icon={Users} navigate={navigate} />
          <SubLink label="Set Permissions" to="/dashboard/role-permissions" icon={ShieldCheck} navigate={navigate} />
        </FunctionCard>

        {/* 3. Approvals */}
        <FunctionCard
          title="Approvals"
          desc="Approve Vehicles, Drivers & Customers"
          bgColor="bg-teal-50"
          accentColor="text-teal-700"
          icon={CheckCircle2}
        >
          <SubLink label="Vehicle Approval" to="/dashboard/vehicle-approval" icon={Truck} navigate={navigate} />
          <SubLink label="Driver Approval" to="/dashboard/driver-approval" icon={UserCheck} navigate={navigate} />
          <SubLink label="Customer / Consignor" to="/dashboard/customer-approval" icon={HandshakeIcon} navigate={navigate} />
        </FunctionCard>

        {/* 4. Analytics */}
        <FunctionCard
          title="Analytics"
          desc="View dashboard & reports"
          bgColor="bg-orange-50"
          accentColor="text-orange-700"
          icon={BarChart3}
        >
          <SubLink label="View Dashboard" to="/dashboard/analytics" icon={BarChart3} navigate={navigate} />
          <SubLink label="Reports" to="/dashboard/reports" icon={FileText} navigate={navigate} />
        </FunctionCard>
      </div>

      {/* ── Return to Dashboard (bottom anchor) ────────── */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-600 transition-colors font-medium"
        >
          <LayoutDashboard className="w-4 h-4" />
          Return to Dashboard
        </button>
      </div>

    </div>
  );
};

export default Overview;
