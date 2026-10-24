import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, Users } from 'lucide-react';
import hrmApi from '../../api/hrmAxios';
import { useHRMAuth } from '../../context/HRMAuthContext';
import logoUrl from '../../assets/logo.jpeg';

const HRMLogin = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useHRMAuth();

  const registered = location.state?.registered === true;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (email.trim() === 'hrmsuperadmin@gmail.com' && password === 'hrmsuperadmin@1234') {
      login('hrm-superadmin-static', {
        _id: 'hrm-superadmin-static',
        name: 'HRM Superadmin',
        email: 'hrmsuperadmin@gmail.com',
        hrmRole: 'superadmin',
        employeeId: 'HRM-SA-001',
        department: 'Human Resources',
      });
      window.location.replace('/hrm-dashboard');
      return;
    }

    // ERP superadmin crossover — same credentials work in HRM as superadmin
    if (email.trim() === 'superadmin@gmail.com' && password === 'superadmin@1234') {
      login('hrm-superadmin-static', {
        _id: 'hrm-superadmin-static',
        name: 'Superadmin',
        email: 'superadmin@gmail.com',
        hrmRole: 'superadmin',
        employeeId: 'ERP-SA-001',
        department: 'Management',
      });
      window.location.replace('/hrm-dashboard');
      return;
    }

    setLoading(true);
    try {
      const { data } = await hrmApi.post('/hrm/auth/login', { email: email.trim(), password });
      login(data.token, data.employee);
      navigate('/hrm-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[540px]">

        {/* ── LEFT: form ── */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-100 rounded-xl p-2">
              <Users className="w-5 h-5 text-emerald-700" />
            </div>
            <span className="text-sm font-semibold text-emerald-700">HRM Portal</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-8">Sign in to your HRM account</p>

          {registered && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Account created! Please log in to continue.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <input
              id="hrm-email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-transparent focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />

            <div className="relative">
              <input
                id="hrm-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 pr-12 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-transparent focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8">
            Don&apos;t have an account?{' '}
            <Link to="/hrm/register" className="text-emerald-600 hover:text-emerald-800 font-semibold transition">
              Register
            </Link>
          </p>
        </div>

        {/* ── RIGHT: brand ── */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500
                        flex-col items-center justify-center px-8 py-10 relative overflow-hidden select-none">

          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-teal-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mb-7">
            <div className="bg-white rounded-3xl p-5 shadow-2xl border border-white/60">
              <img src={logoUrl} alt="New Popular Transport" className="w-36 h-36 object-contain rounded-xl" />
            </div>
          </div>

          <div className="z-10 text-center max-w-xs">
            <h3 className="text-white text-xl font-bold mb-2">New Popular Transport Pvt Ltd</h3>
            <p className="text-emerald-100 text-xs leading-relaxed">
              Manage employees, leaves, payslips and HR operations all from one unified dashboard.
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

export default HRMLogin;
