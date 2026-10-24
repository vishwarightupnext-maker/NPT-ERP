import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import logoUrl from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'w-full px-4 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-transparent focus:outline-none focus:border-purple-600 focus:bg-white transition-all duration-150';

const SuperAdminRegister = () => {
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
        const { data } = await api.post('/auth/superadmin/register', { name, email, password });
        if (data.token && data.user) {
          login(data.token, data.user);
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/superadmin/login', { state: { registered: true } });
        }
      } catch (err) {
        const status = err.response?.status;
        setAlreadyExists(status === 409);
        setError(err.response?.data?.message || 'Super Admin Registration failed.');
      } finally {
        setLoading(false);
      }
    },
    [name, email, password, confirmPassword, navigate, login]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] border border-purple-500/20">
        {/* LEFT: form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Portal
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Super Admin Register</h1>
          <p className="text-sm text-gray-500 mb-8">Create a Super Admin root account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
              {alreadyExists && (
                <p className="mt-2 text-red-500">
                  Already have a Super Admin account?{' '}
                  <Link to="/superadmin/login" className="font-semibold underline hover:text-red-700 transition">
                    Sign in here
                  </Link>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input
              id="super-reg-name"
              type="text"
              autoComplete="name"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />

            <input
              id="super-reg-email"
              type="email"
              autoComplete="email"
              placeholder="Super Admin Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
            />

            <div className="relative">
              <input
                id="super-reg-password"
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
                id="super-reg-confirm"
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
              className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-purple-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Super Admin Account...
                </>
              ) : (
                'Create Super Admin Account'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-2.5 text-center text-sm">
            <p className="text-gray-500">
              Already registered as Super Admin?{' '}
              <Link to="/superadmin/login" className="text-purple-700 hover:text-purple-900 font-semibold transition">
                Super Admin Login
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Need regular Admin registration?{' '}
              <Link to="/admin/register" className="text-blue-600 hover:text-blue-800 font-semibold underline transition">
                Go to Admin Register
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT: brand */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 flex-col items-center justify-center px-8 py-10 relative overflow-hidden select-none text-white">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mb-7">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/20">
              <img src={logoUrl} alt="New Popular Transport" className="w-36 h-36 object-contain rounded-xl" />
            </div>
          </div>

          <div className="z-10 text-center max-w-xs">
            <h3 className="text-white text-xl font-bold leading-snug mb-2">New Popular Transport Pvt Ltd</h3>
            <p className="text-purple-200 text-xs leading-relaxed">
              Super Admin setup page for root system control & configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminRegister;
