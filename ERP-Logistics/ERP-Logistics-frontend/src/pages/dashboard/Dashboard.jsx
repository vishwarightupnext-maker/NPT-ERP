import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import Sidebar, { MobileMenuBtn } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPendingCount } from '../../store/slices/usersSlice';

const breadcrumbMap = {
  '/dashboard': 'Overview',
  '/dashboard/company-setup': 'Company Setup',
  '/dashboard/invoice-creation': 'Invoice Management',
  '/dashboard/office-expenses': 'Office Expenses',
  '/dashboard/user-management': 'User Management',
  '/dashboard/role-permissions': 'Role Permissions',
  '/dashboard/vehicle-approval': 'Vehicle Approval',
  '/dashboard/driver-approval': 'Driver Approval',
  '/dashboard/driver-management': 'Driver Management',
  '/dashboard/vendor-management': 'Vendor Management',
  '/dashboard/customer-approval': 'Customer / Consignor / Consignee',
  '/dashboard/pricing-rules': 'Pricing Rules',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/reports': 'Reports',
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pendingCount } = useSelector(s => s.users);

  const pageTitle = breadcrumbMap[pathname] || 'Dashboard';

  useEffect(() => {
    dispatch(fetchPendingCount());
    const interval = setInterval(() => dispatch(fetchPendingCount()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3 shrink-0">
          <MobileMenuBtn setOpen={setSidebarOpen} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">{pageTitle}</h1>
            <p className="text-xs text-gray-400 hidden sm:block">New Popular Transport — Super Admin</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Bell notification */}
            <button
              onClick={() => navigate('/dashboard/user-management')}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition"
              title="Pending user approvals"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
