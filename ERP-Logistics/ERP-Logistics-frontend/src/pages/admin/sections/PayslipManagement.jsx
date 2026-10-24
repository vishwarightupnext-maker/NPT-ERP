import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ExternalLink, CreditCard, Plus, X, CheckCircle } from 'lucide-react';
import { fetchEmployees, upsertAttendanceEntry } from '../../../store/slices/hrmSlice';
import { useHRMAuth } from '../../../context/HRMAuthContext';
import Pagination from '../../../components/Pagination';

const STATUS_OPTS = ['Present', 'Half Day', 'Absent'];

const todayStr = () => new Date().toISOString().split('T')[0];
const EMPTY = { employee: '', date: todayStr(), status: 'Present', clockIn: '', clockOut: '' };

const PayslipManagement = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { employees, loading } = useSelector(s => s.hrm);
  const { employee: currentEmp } = useHRMAuth();
  const isSuperAdmin = currentEmp?.hrmRole === 'superadmin';

  const [search, setSearch] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) dispatch(fetchEmployees({ includeErp: true }));
  }, [dispatch, isSuperAdmin]);

  const filtered = employees.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(EMPTY); setError(''); setSuccess(false); setShowModal(true); };

  const handleSave = async () => {
    if (!form.employee) { setError('Select an employee.'); return; }
    if (!form.date)     { setError('Select a date.'); return; }
    setSaving(true); setError('');
    try {
      await dispatch(upsertAttendanceEntry({
        employee: form.employee,
        date:     form.date,
        status:   form.status,
        clockIn:  form.status !== 'Absent' ? form.clockIn  : '',
        clockOut: form.status !== 'Absent' ? form.clockOut : '',
      })).unwrap();
      setSuccess(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to add payslip entry.');
    } finally {
      setSaving(false);
    }
  };

  const goToPayslip = () => {
    setShowModal(false);
    navigate(`/hrm-dashboard/payslips/employee/${form.employee}`);
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        <p className="text-sm text-gray-400">Access restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar + Add Payslip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee by name, ID, or department…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm
                         focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button onClick={openAdd}
            className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Payslip</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Employee list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="bg-violet-50 rounded-xl p-2.5 shrink-0">
            <Users className="w-5 h-5 text-violet-700" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800">Payslip Management</h2>
            <p className="text-xs text-gray-400 hidden sm:block">
              Select an employee to view attendance-based salary calculation
            </p>
          </div>
          <span className="ml-auto text-xs text-gray-400 shrink-0">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-4">
          {loading && (
            <p className="text-center py-12 text-gray-400 text-sm">Loading employees…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center py-12 text-gray-400 text-sm">No employees found.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(emp => (
              <div
                key={emp._id}
                onClick={() => navigate(`/hrm-dashboard/payslips/employee/${emp._id}`)}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100
                           hover:border-emerald-300 hover:bg-emerald-50/40 cursor-pointer
                           transition-all group"
              >
                <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center
                                text-violet-700 font-bold text-base shrink-0">
                  {emp.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 text-sm flex items-center gap-1
                                group-hover:text-emerald-700 transition-colors">
                    {emp.name}
                    <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-emerald-400 shrink-0" />
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {emp.employeeId} · {emp.department || '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {emp.designation || emp.hrmRole || '—'}
                  </p>
                </div>
                {emp.salary > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Salary</p>
                    <p className="text-xs font-semibold text-emerald-700">
                      ₹{Number(emp.salary).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[6, 12, 24, 48]}
        />
      </div>

      {/* Add Payslip modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Add Payslip</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {success ? (
                <div className="text-center py-4 space-y-3">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="text-sm text-gray-700 font-medium">
                    Attendance entry added for {employees.find(e => e._id === form.employee)?.name}.
                  </p>
                  <p className="text-xs text-gray-400">
                    Open their payslip to enter the per-day salary and generate the net pay.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                    <select value={form.employee} onChange={e => set('employee', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <option value="">Select employee</option>
                      {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                      max={todayStr()}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Attendance</label>
                    <div className="flex gap-2">
                      {STATUS_OPTS.map(s => (
                        <button key={s} type="button"
                          onClick={() => set('status', s)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            form.status === s
                              ? s === 'Present'  ? 'bg-emerald-600 text-white border-emerald-600'
                              : s === 'Half Day' ? 'bg-yellow-500 text-white border-yellow-500'
                              :                    'bg-red-600 text-white border-red-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.status !== 'Absent' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                        <input type="time" value={form.clockIn} onChange={e => set('clockIn', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
                        <input type="time" value={form.clockOut} onChange={e => set('clockOut', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              {success ? (
                <>
                  <button onClick={() => { setForm(EMPTY); setSuccess(false); }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">
                    Add Another
                  </button>
                  <button onClick={goToPayslip}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                    View Payslip
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                    {saving ? 'Saving…' : 'Save Entry'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipManagement;
