
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { HRMAuthProvider } from './context/HRMAuthContext';

import ProtectedRoute from './components/ProtectedRoute';
import HRMProtectedRoute from './components/HRMProtectedRoute';

// Authentication pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Super Admin and Admin authentication
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminRegister from './pages/SuperAdminRegister';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';

// HRM portal
import HRMLogin from './pages/hrm/HRMLogin';
import HRMRegister from './pages/hrm/HRMRegister';
import HRMPortal from './pages/hrm/HRMPortal';

import HRMOverview from './pages/admin/sections/HRMOverview';
import EmployeeManagement from './pages/admin/sections/EmployeeManagement';
import LeaveManagement from './pages/admin/sections/LeaveManagement';
import PayslipManagement from './pages/admin/sections/PayslipManagement';
import EmployeePayslipDetail from './pages/admin/sections/EmployeePayslipDetail';

import TimeTracker from './pages/hrm/sections/TimeTracker';
import AttendanceManagement from './pages/hrm/sections/AttendanceManagement';
import MyPayslips from './pages/hrm/sections/MyPayslips';

// Super Admin dashboard
import Dashboard from './pages/dashboard/Dashboard';
import Overview from './pages/dashboard/Overview';
import CompanySetup from './pages/dashboard/sections/CompanySetup';
import UserManagement from './pages/dashboard/sections/UserManagement';
import RolePermissions from './pages/dashboard/sections/RolePermissions';
import VehicleApproval from './pages/dashboard/sections/VehicleApproval';
import DriverApproval from './pages/dashboard/sections/DriverApproval';
import CustomerApproval from './pages/dashboard/sections/CustomerApproval';
import PricingRules from './pages/dashboard/sections/PricingRules';
import Analytics from './pages/dashboard/sections/Analytics';
import Reports from './pages/dashboard/sections/ReportsHub';
import VendorManagementHub from './pages/dashboard/sections/vendor/VendorManagementHub';
import OfficeExpenseHub from './pages/dashboard/sections/expense/OfficeExpenseHub';

// Admin dashboard
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOverview from './pages/admin/AdminOverview';

import VehicleManagementHub from './pages/admin/sections/vehicle/VehicleManagementHub';
import DriverManagementHub from './pages/admin/sections/driver/DriverManagementHub';

import DispatchCreation from './pages/admin/sections/DispatchCreation';
import LRCreation from './pages/admin/sections/LRCreation';
import InvoiceCreation from './pages/admin/sections/InvoiceCreation';
import DispatchApproval from './pages/admin/sections/DispatchApproval';
import RoutePlanning from './pages/admin/sections/RoutePlanning';
import BillingManagement from './pages/admin/sections/BillingManagement';
import DeliveryConfirmation from './pages/admin/sections/DeliveryConfirmation';
import PODVerification from './pages/admin/sections/PODVerification';
import TripExpenseHub from './pages/admin/sections/expense/TripExpenseHub';

const App = () => {
  return (
    <BrowserRouter basename="/admin">
      <HRMAuthProvider>
        <AuthProvider>
          <Routes>
            {/* Default route */}
            <Route
              path="/"
              element={<Navigate to="/admin/login" replace />}
            />

            {/* Super Admin authentication */}
            <Route
              path="/superadmin/login"
              element={<SuperAdminLogin />}
            />

            <Route
              path="/super-admin/login"
              element={<SuperAdminLogin />}
            />

            <Route
              path="/superadmin/register"
              element={<SuperAdminRegister />}
            />

            <Route
              path="/super-admin/register"
              element={<SuperAdminRegister />}
            />

            {/* Admin authentication */}
            <Route
              path="/admin/login"
              element={<AdminLogin />}
            />

            <Route
              path="/admin/register"
              element={<AdminRegister />}
            />

            {/* General authentication routes */}
            <Route
              path="/login"
              element={<AdminLogin />}
            />

            <Route
              path="/register"
              element={<AdminRegister />}
            />

            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />

            {/* HRM authentication */}
            <Route
              path="/hrm/login"
              element={<HRMLogin />}
            />

            <Route
              path="/hrm/register"
              element={<HRMRegister />}
            />

            {/* HRM portal */}
            <Route
              path="/hrm-dashboard"
              element={
                <HRMProtectedRoute>
                  <HRMPortal />
                </HRMProtectedRoute>
              }
            >
              <Route index element={<HRMOverview />} />

              <Route
                path="employees"
                element={<EmployeeManagement />}
              />

              <Route
                path="leaves"
                element={<LeaveManagement />}
              />

              <Route
                path="payslips"
                element={<PayslipManagement />}
              />

              <Route
                path="payslips/employee/:empId"
                element={<EmployeePayslipDetail />}
              />

              <Route
                path="attendance"
                element={<AttendanceManagement />}
              />

              <Route
                path="time-tracker"
                element={<TimeTracker />}
              />

              <Route
                path="my-payslips"
                element={<MyPayslips />}
              />
            </Route>

            {/* Super Admin dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />

              <Route
                path="company-setup"
                element={<CompanySetup />}
              />

              <Route
                path="invoice-creation"
                element={<InvoiceCreation />}
              />

              <Route
                path="office-expenses"
                element={<OfficeExpenseHub />}
              />

              <Route
                path="user-management"
                element={<UserManagement />}
              />

              <Route
                path="role-permissions"
                element={<RolePermissions />}
              />

              <Route
                path="vehicle-approval"
                element={<VehicleApproval />}
              />

              <Route
                path="driver-approval"
                element={<DriverApproval />}
              />

              <Route
                path="customer-approval"
                element={<CustomerApproval />}
              />

              <Route
                path="pricing-rules"
                element={<PricingRules />}
              />

              <Route
                path="driver-management"
                element={
                  <DriverManagementHub
                    hideTabs={['attendance', 'salary']}
                  />
                }
              />

              <Route
                path="vendor-management"
                element={<VendorManagementHub />}
              />

              <Route
                path="analytics"
                element={<Analytics />}
              />

              <Route
                path="reports"
                element={<Reports />}
              />
            </Route>

            {/* Admin dashboard */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute
                  roles={['Admin', 'Manager', 'Viewer']}
                >
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />

              <Route
                path="vehicles"
                element={<VehicleManagementHub />}
              />

              <Route
                path="drivers"
                element={
                  <DriverManagementHub
                    hideTabs={['attendance', 'salary']}
                  />
                }
              />

              <Route
                path="dispatch-creation"
                element={<DispatchCreation />}
              />

              <Route
                path="lr-creation"
                element={<LRCreation />}
              />

              <Route
                path="dispatch-approval"
                element={<DispatchApproval />}
              />

              <Route
                path="route-planning"
                element={<RoutePlanning />}
              />

              <Route
                path="billing"
                element={<BillingManagement />}
              />

              <Route
                path="delivery-confirmation"
                element={<DeliveryConfirmation />}
              />

              <Route
                path="pod-verification"
                element={<PODVerification />}
              />

              <Route
                path="trip-expenses"
                element={<TripExpenseHub />}
              />
            </Route>

            {/* Fallback */}
            <Route
              path="*"
              element={<Navigate to="/login" replace />}
            />
          </Routes>
        </AuthProvider>
      </HRMAuthProvider>
    </BrowserRouter>
  );
};

export default App;
