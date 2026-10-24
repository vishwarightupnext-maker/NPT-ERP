import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.jpeg';

const Login = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { login } = useAuth();

  const registered = location.state?.registered === true;

  /* ── separate state per field avoids the spread/synthetic-event cursor bug ── */
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [error,      setError]      = useState('');
  const [notFound,   setNotFound]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotFound(false);

    /* ── Hardcoded SuperAdmin — persist to localStorage then hard-navigate ── */
    if (email.trim() === 'superadmin@gmail.com' && password === 'superadmin@1234') {
      login('superadmin-static', { name: 'Superadmin', email: 'superadmin@gmail.com', role: 'superadmin' });
      window.location.replace('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      login(data.token, data.user);
      navigate(data.user.role === 'superadmin' ? '/dashboard' : '/admin-dashboard', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setNotFound(status === 404);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center p-4">

      {/* Card */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[540px]">

        {/* ════════════════════════════════════════
            LEFT — Login form
        ════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">

          {/* Portal Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 self-start gap-1 text-xs font-semibold">
            <Link to="/admin/login" className="px-3 py-1.5 rounded-lg bg-white text-blue-700 shadow-sm transition">
              Admin Login
            </Link>
            <Link to="/superadmin/login" className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-purple-700 transition">
              Super Admin Login
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-1">Login</h1>
          <p className="text-sm text-gray-400 mb-8">Enter your credentials to access your portal</p>

          {registered && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Account created! Please log in to continue.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
              {notFound && (
                <p className="mt-2 text-red-500">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="font-semibold underline hover:text-red-700 transition">
                    Sign up here
                  </Link>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="Username or email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400
                           border border-transparent focus:outline-none focus:border-blue-500 focus:bg-white
                           transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 pr-12 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400
                           border border-transparent focus:outline-none focus:border-blue-500 focus:bg-white
                           transition-all duration-150"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800 font-medium transition">
                Forgot password ?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold
                         py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold transition">
              Sign up
            </Link>
          </p>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Brand panel
        ════════════════════════════════════════ */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500
                        flex-col items-center justify-center px-8 py-10 relative overflow-hidden select-none">

          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 mb-7">
            <div className="bg-white rounded-3xl p-5 shadow-2xl border border-white/60">
              <img src={logoUrl} alt="New Popular Transport" className="w-36 h-36 object-contain rounded-xl" />
            </div>
          </div>

          <div className="z-10 text-center max-w-xs px-2">
            <h3 className="text-white text-xl font-bold leading-snug mb-2">
              New Popular Transport Pvt Ltd
            </h3>
            <p className="text-blue-100 text-xs leading-relaxed">
              Real-time dispatch, driver, and shipment management
              all in one powerful logistics dashboard.
            </p>
          </div>

          <div className="flex gap-2 mt-6 z-10">
            <span className="w-6 h-1.5 bg-white rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
