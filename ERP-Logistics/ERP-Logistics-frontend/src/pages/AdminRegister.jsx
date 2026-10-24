import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, UserCheck, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import logoUrl from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'w-full px-4 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-transparent focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-150';

const AdminRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setAlreadyExists(false);
      if (password !== confirmPassword) return setError('Passwords do not match.');
      if (password.length < 6) return setError('Password must be at least 6 characters.');
      setLoading(true);
      try {
        const { data } = await api.post('/auth/admin/register', { name, email, password, role: 'Admin' });
        if (data.token && data.user) {
          login(data.token, data.user);
          navigate('/admin-dashboard', { replace: true });
        } else {
          navigate('/admin/login', { state: { registered: true } });
        }
      } catch (err) {
        const status = err.response?.status;
        setAlreadyExists(status === 409);
        setError(err.response?.data?.message || 'Admin Registration failed.');
      } finally {
        setLoading(false);
      }
    },
    [name, email, password, confirmPassword, navigate, login]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        {/* LEFT: form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Admin Registration
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Create Admin Account</h1>
          <p className="text-sm text-gray-400 mb-2">Register to get started immediately (Auto-Approved)</p>

          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mb-6">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            No Super Admin approval required. Instant activation!
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
              {alreadyExists && (
                <p className="mt-2 text-red-500">
                  Already have an account?{' '}
                  <Link to="/admin/login" className="font-semibold underline hover:text-red-700 transition">
                    Sign in here
                  </Link>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input
              id="admin-reg-name"
              type="text"
              autoComplete="name"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />

            <input
              id="admin-reg-email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
            />

            <div className="relative">
              <input
                id="admin-reg-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <input
                id="admin-reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-1 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Registering Admin...
                </>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-2 text-center text-sm">
            <p className="text-gray-400">
              Already have an Admin account?{' '}
              <Link to="/admin/login" className="text-blue-600 hover:text-blue-800 font-semibold transition">
                Sign in
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Super Admin?{' '}
              <Link to="/superadmin/register" className="text-purple-600 hover:text-purple-800 font-semibold underline transition">
                Go to Super Admin Register
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT: brand */}
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

          <div className="z-10 text-center max-w-xs">
            <h3 className="text-white text-xl font-bold leading-snug mb-2">New Popular Transport Pvt Ltd</h3>
            <p className="text-blue-100 text-xs leading-relaxed">
              Manage your entire logistics operation — dispatches, drivers, vehicles, and deliveries — from one unified platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
