import { useState } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, CreditCard,
  LogOut, Menu, X, UserCircle,
  ClipboardList, ShieldCheck,
} from 'lucide-react';
import { useHRMAuth } from '../../context/HRMAuthContext';
import logoUrl from '../../assets/logo.jpeg';

const SUPERADMIN_NAV = [
  { to: '/hrm-dashboard',            icon: LayoutDashboard, label: 'Dashboard',        end: true },
  { to: '/hrm-dashboard/employees',  icon: Users,           label: 'Employees' },
  { to: '/hrm-dashboard/attendance', icon: ClipboardList,   label: 'Attendance' },
  // { to: '/hrm-dashboard/leaves',     icon: Calendar,        label: 'Leave Management' },
  { to: '/hrm-dashboard/payslips',   icon: CreditCard,      label: 'Payslips' },
];

const EMPLOYEE_NAV = [
  { to: '/hrm-dashboard',                icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/hrm-dashboard/time-tracker',   icon: ClipboardList,   label: 'My Attendance' },
  { to: '/hrm-dashboard/my-payslips',    icon: CreditCard,      label: 'My Payslips' },
  // { to: '/hrm-dashboard/leaves',         icon: Calendar,        label: 'Leave' },
];

const breadcrumbMap = {
  '/hrm-dashboard':              'HRM Dashboard',
  '/hrm-dashboard/employees':    'Employees',
  '/hrm-dashboard/leaves':       'Leave Management',
  '/hrm-dashboard/payslips':     'Payslips',
  '/hrm-dashboard/attendance':   'Attendance Management',

  '/hrm-dashboard/time-tracker': 'My Attendance',
  '/hrm-dashboard/my-payslips':  'My Payslips',
};

const Sidebar = ({ open, setOpen }) => {
  const { employee, logout } = useHRMAuth();
  const navigate = useNavigate();
  const isSuperAdmin = employee?.hrmRole === 'superadmin';
  const navItems = isSuperAdmin ? SUPERADMIN_NAV : EMPLOYEE_NAV;

  const handleLogout = () => { logout(); navigate('/hrm/login'); };

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
      <aside className={`fixed top-0 left-0 h-full z-30 w-64 bg-gradient-to-b from-emerald-950 to-teal-900 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="bg-white rounded-xl p-1 shrink-0">
            <img src={logoUrl} alt="New Popular Transport" className="w-8 h-8 object-contain rounded-lg" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">HRM Portal</p>
            <p className="text-emerald-300 text-xs">{isSuperAdmin ? 'Super Admin' : 'Employee'}</p>
          </div>
          <button className="ml-auto lg:hidden text-white" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-1">
            {isSuperAdmin ? (
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {employee?.name?.[0]?.toUpperCase() || 'E'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{employee?.name}</p>
              <p className="text-emerald-300 text-[10px]">
                {isSuperAdmin ? 'HRM Super Admin' : `${employee?.employeeId || ''} · ${employee?.hrmRole || ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

const HRMPortal = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { employee } = useHRMAuth();
  const { pathname } = useLocation();
  const isSuperAdmin = employee?.hrmRole === 'superadmin';
  const pageTitle = breadcrumbMap[pathname]
    ?? (pathname.includes('/payslips/employee/') ? 'Day-wise Payslip Entry' : 'HRM');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">{pageTitle}</h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              HRM Portal — {isSuperAdmin ? 'Human Resources' : (employee?.department || 'Human Resources')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isSuperAdmin
              ? <ShieldCheck className="w-5 h-5 text-yellow-500" />
              : <UserCircle className="w-5 h-5 text-emerald-600" />
            }
            <span className="hidden sm:block text-sm font-medium text-gray-700">{employee?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default HRMPortal;
