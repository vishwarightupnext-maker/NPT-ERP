import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, ShieldCheck, Truck,
  UserCheck, HandshakeIcon, Tag, FileText, Percent,
  LogOut, Truck as TruckLogo, Menu, X, Wallet, Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from "../assets/logo.jpeg";
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/company-setup', icon: Building2, label: 'Company Setup' },
  { to: '/dashboard/invoice-creation', icon: Receipt, label: 'Invoice Management' },
  { to: '/dashboard/office-expenses', icon: Wallet, label: 'Office Expenses' },
  { to: '/dashboard/user-management', icon: Users, label: 'User Management' },
  // { to: '/dashboard/role-permissions', icon: ShieldCheck, label: 'Role Permissions' },
  { to: '/dashboard/vehicle-approval', icon: Truck, label: 'Vehicle Approval' },
  { to: '/dashboard/customer-approval', icon: HandshakeIcon, label: 'Customer / Consignor' },
  { to: '/dashboard/pricing-rules', icon: Tag, label: 'Pricing Rules' },
  { to: '/dashboard/driver-approval', icon: UserCheck, label: 'Driver Approval' },
  { to: '/dashboard/driver-management', icon: UserCheck, label: 'Driver Management' },
  { to: '/dashboard/vendor-management', icon: Percent, label: 'Vendor Management' },
  { to: '/dashboard/reports', icon: FileText, label: 'Reports' },
];

const Sidebar = ({ open, setOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-30 w-64 bg-gradient-to-b from-blue-950 to-blue-900 flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center gap-1 px-6 py-5 border-b ">
          <div className="bg-white rounded-xl">
            <img src={Logo} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">New Popular Transport</p>
            <p className="text-blue-300 text-xs">Super Admin</p>
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

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-blue-300 text-xs truncate">{user?.email || ''}</p>
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

export const MobileMenuBtn = ({ setOpen }) => (
  <button
    className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
    onClick={() => setOpen((v) => !v)}
  >
    <Menu className="w-5 h-5" />
  </button>
);

export default Sidebar;
