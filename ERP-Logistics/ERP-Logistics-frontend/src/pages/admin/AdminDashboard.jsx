import { useState } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Truck, UserCheck, PackagePlus, FileText,
  Receipt, ClipboardCheck, Map, CreditCard, PackageCheck,
  ShieldCheck, LogOut, Menu, X, Truck as TruckLogo, Fuel,
} from 'lucide-react';
import Logo from "../../assets/logo.jpeg"
const navItems = [
  { to: '/admin-dashboard',                        icon: LayoutDashboard, label: 'Overview',             end: true },
  { to: '/admin-dashboard/vehicles',               icon: Truck,           label: 'Vehicle Management' },
  { to: '/admin-dashboard/drivers',                icon: UserCheck,       label: 'Driver Management' },
  { to: '/admin-dashboard/dispatch-creation',      icon: PackagePlus,     label: 'Dispatch Creation' },
  { to: '/admin-dashboard/lr-creation',            icon: FileText,        label: 'LR Creation' },
  { to: '/admin-dashboard/dispatch-approval',      icon: ClipboardCheck,  label: 'Dispatch Approval' },
  { to: '/admin-dashboard/route-planning',         icon: Map,             label: 'Route Planning' },
  { to: '/admin-dashboard/billing',                icon: CreditCard,      label: 'Billing Management' },
  { to: '/admin-dashboard/delivery-confirmation',  icon: PackageCheck,    label: 'Delivery Confirmation' },
  { to: '/admin-dashboard/pod-verification',       icon: ShieldCheck,     label: 'POD Verification' },
  { to: '/admin-dashboard/trip-expenses',          icon: Fuel,            label: 'Trip Expenses' },
];

const breadcrumbMap = {
  '/admin-dashboard':                       'Overview',
  '/admin-dashboard/vehicles':              'Vehicle Management',
  '/admin-dashboard/drivers':               'Driver Management',
  '/admin-dashboard/dispatch-creation':     'Dispatch Creation',
  '/admin-dashboard/lr-creation':           'LR Creation',
  '/admin-dashboard/dispatch-approval':     'Dispatch Approval',
  '/admin-dashboard/route-planning':        'Route Planning',
  '/admin-dashboard/billing':               'Billing Management',
  '/admin-dashboard/delivery-confirmation': 'Delivery Confirmation',
  '/admin-dashboard/pod-verification':      'POD Verification',
  '/admin-dashboard/trip-expenses':         'Trip Expenses',
};

const Sidebar = ({ open, setOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-emerald-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-30 w-64 bg-gradient-to-b from-emerald-950 to-emerald-900 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="flex items-center gap-1 px-6 py-5 border-b">
          <div className="bg-white rounded-xl">
            <img src={Logo} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">New Popular Transport</p>
            <p className="text-emerald-300 text-xs">Admin Portal</p>
          </div>
          <button className="ml-auto lg:hidden text-white" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-emerald-300 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition font-medium"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = breadcrumbMap[pathname] || 'Admin Dashboard';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3 shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setSidebarOpen(v => !v)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">{pageTitle}</h1>
            <p className="text-xs text-gray-400 hidden sm:block">New Popular Transport — Admin Portal</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
