import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.jpeg';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Static fallback for superadmin
    if (email.trim() === 'superadmin@gmail.com' && password === 'superadmin@1234') {
      login('superadmin-static', { name: 'Superadmin', email: 'superadmin@gmail.com', role: 'superadmin' });
      window.location.replace('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/superadmin/login', { email: email.trim(), password });
      login(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Super Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px] border border-purple-500/20">

        {/* LEFT — Login form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Portal
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Super Admin Login</h1>
          <p className="text-sm text-gray-500 mb-8">Access system control, global settings & permissions</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Super Admin Email
              </label>
              <input
                id="superadmin-login-email"
                type="email"
                autoComplete="email"
                placeholder="superadmin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400
                           border border-transparent focus:outline-none focus:border-purple-600 focus:bg-white
                           transition-all duration-150"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="superadmin-login-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 pr-12 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400
                           border border-transparent focus:outline-none focus:border-purple-600 focus:bg-white
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
                  className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-purple-600 hover:text-purple-800 font-medium transition">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white font-semibold
                         py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-purple-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                'Sign In to Super Admin'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-2.5 text-center text-sm">
            <p className="text-gray-500">
              Need to register as Super Admin?{' '}
              <Link to="/superadmin/register" className="text-purple-700 hover:text-purple-900 font-semibold transition">
                Super Admin Register
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Looking for regular Admin portal?{' '}
              <Link to="/admin/login" className="text-blue-600 hover:text-blue-800 font-semibold underline transition">
                Go to Admin Login
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT — Brand panel */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900
                        flex-col items-center justify-center px-8 py-10 relative overflow-hidden select-none text-white">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mb-7">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/20">
              <img src={logoUrl} alt="New Popular Transport" className="w-36 h-36 object-contain rounded-xl" />
            </div>
          </div>

          <div className="z-10 text-center max-w-xs px-2">
            <h3 className="text-white text-xl font-bold leading-snug mb-2">
              Super Admin Console
            </h3>
            <p className="text-purple-200 text-xs leading-relaxed">
              Complete administrative authority, company setup, pricing rules, system logs, and full oversight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
