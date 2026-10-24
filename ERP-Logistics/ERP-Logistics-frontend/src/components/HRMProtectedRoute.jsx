import { Navigate } from 'react-router-dom';
import { useHRMAuth } from '../context/HRMAuthContext';

const HRMProtectedRoute = ({ children }) => {
  const { employee, loading } = useHRMAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) return <Navigate to="/hrm/login" replace />;
  return children;
};

export default HRMProtectedRoute;
