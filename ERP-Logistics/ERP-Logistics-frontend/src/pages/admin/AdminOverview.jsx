import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Truck, UserCheck, PackagePlus, FileText, Receipt,
  ClipboardCheck, Map, CreditCard, PackageCheck, ShieldCheck,
  LayoutDashboard, ChevronRight,
} from 'lucide-react';

const cards = [
  { label: 'Vehicle Management',      to: '/admin-dashboard/vehicles',              icon: Truck,          color: 'bg-sky-50 text-sky-700',      bg: 'bg-sky-50' },
  { label: 'Driver Management',       to: '/admin-dashboard/drivers',               icon: UserCheck,      color: 'bg-teal-50 text-teal-700',    bg: 'bg-teal-50' },
  { label: 'Dispatch Creation',       to: '/admin-dashboard/dispatch-creation',     icon: PackagePlus,    color: 'bg-violet-50 text-violet-700', bg: 'bg-violet-50' },
  { label: 'LR Creation',             to: '/admin-dashboard/lr-creation',           icon: FileText,       color: 'bg-indigo-50 text-indigo-700', bg: 'bg-indigo-50' },
  { label: 'Invoice Creation',        to: '/admin-dashboard/invoice-creation',      icon: Receipt,        color: 'bg-amber-50 text-amber-700',   bg: 'bg-amber-50' },
  { label: 'Dispatch Approval',       to: '/admin-dashboard/dispatch-approval',     icon: ClipboardCheck, color: 'bg-green-50 text-green-700',   bg: 'bg-green-50' },
  { label: 'Route Planning',          to: '/admin-dashboard/route-planning',        icon: Map,            color: 'bg-blue-50 text-blue-700',     bg: 'bg-blue-50' },
  { label: 'Billing Management',      to: '/admin-dashboard/billing',               icon: CreditCard,     color: 'bg-pink-50 text-pink-700',     bg: 'bg-pink-50' },
  { label: 'Delivery Confirmation',   to: '/admin-dashboard/delivery-confirmation', icon: PackageCheck,   color: 'bg-emerald-50 text-emerald-700', bg: 'bg-emerald-50' },
  { label: 'POD Verification',        to: '/admin-dashboard/pod-verification',      icon: ShieldCheck,    color: 'bg-orange-50 text-orange-700', bg: 'bg-orange-50' },
];

const AdminOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-emerald-100 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold mt-0.5">{user?.name || 'Admin'}</h2>
          <p className="text-emerald-200 text-sm mt-1">Admin Portal — Daily Operations Management</p>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 hidden sm:block">
          <LayoutDashboard className="w-8 h-8 text-white" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Daily Operations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map(({ label, to, icon: Icon, color, bg }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left group"
            >
              <div className={`rounded-xl p-3 ${bg} shrink-0`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{label}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
