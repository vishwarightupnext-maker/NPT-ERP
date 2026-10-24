import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, UserCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.jpeg';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const registered = location.state?.registered === true;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotFound(false);

    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/login', { email: email.trim(), password });
      login(data.token, data.user);
      navigate('/admin-dashboard', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setNotFound(status === 404);
      setError(err.response?.data?.message || 'Admin login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]">
        {/* LEFT — Login form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Admin Portal
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Admin Login</h1>
          <p className="text-sm text-gray-400 mb-8">Login to manage operations, drivers, dispatches & fleet</p>

          {registered && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Admin account created & auto-approved! Log in to continue.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
              {notFound && (
                <p className="mt-2 text-red-500">
                  Don&apos;t have an Admin account?{' '}
                  <Link to="/admin/register" className="font-semibold underline hover:text-red-700 transition">
                    Sign up here
                  </Link>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400
                           border border-transparent focus:outline-none focus:border-blue-500 focus:bg-white
                           transition-all duration-150"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="admin-login-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 pr-12 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400
                           border border-transparent focus:outline-none focus:border-blue-500 focus:bg-white
                           transition-all duration-150"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3.5 bottom-3.5 text-gray-400 hover:text-gray-600 transition"
              >
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800 font-medium transition">
                Forgot password ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold
                         py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-1 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                'Admin Login'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-2 text-center text-sm">
            <p className="text-gray-400">
              Don&apos;t have an Admin account?{' '}
              <Link to="/admin/register" className="text-blue-600 hover:text-blue-800 font-semibold transition">
                Admin Sign Up
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Super Admin?{' '}
              <Link to="/superadmin/login" className="text-purple-600 hover:text-purple-800 font-semibold underline transition">
                Go to Super Admin Login
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT — Brand panel */}
        <div
          className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500
                        flex-col items-center justify-center px-8 py-10 relative overflow-hidden select-none"
        >
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mb-7">
            <div className="bg-white rounded-3xl p-5 shadow-2xl border border-white/60">
              <img src={logoUrl} alt="New Popular Transport" className="w-36 h-36 object-contain rounded-xl" />
            </div>
          </div>

          <div className="z-10 text-center max-w-xs px-2">
            <h3 className="text-white text-xl font-bold leading-snug mb-2">New Popular Transport Pvt Ltd</h3>
            <p className="text-blue-100 text-xs leading-relaxed">
              Real-time dispatch, driver, and shipment management all in one powerful logistics dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
