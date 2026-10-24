import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, Plus, X, Search, Check, XCircle, Trash2, Filter } from 'lucide-react';
import { fetchLeaves, createLeave, updateLeaveStatus, deleteLeave, fetchEmployees } from '../../../store/slices/hrmSlice';
import Pagination from '../../../components/Pagination';

const TYPES  = ['Sick Leave','Casual Leave','Annual Leave','Maternity Leave','Paternity Leave','Emergency Leave'];
const STATUS = ['Pending','Approved','Rejected'];

const statusColor = {
  Pending:  'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

const EMPTY = { employeeId: '', leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' };

const cls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

const LeaveManagement = () => {
  const dispatch = useDispatch();
  const { leaves, employees, loading } = useSelector(s => s.hrm);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [filterStatus, setFStatus] = useState('');
  const [filterType,   setFType]   = useState('');
  const [search, setSearch]        = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchLeaves());
    if (!employees.length) dispatch(fetchEmployees({ includeErp: true }));
  }, [dispatch]);

  const applyFilter = () => dispatch(fetchLeaves({ status: filterStatus, type: filterType, search }));
  const resetFilter = () => { setFStatus(''); setFType(''); setSearch(''); dispatch(fetchLeaves()); };

  const handleSave = async () => {
    if (!form.employeeId || !form.fromDate || !form.toDate) { setError('Employee, From and To dates are required.'); return; }
    if (new Date(form.toDate) < new Date(form.fromDate)) { setError('To date cannot be before From date.'); return; }
    setSaving(true); setError('');
    try {
      await dispatch(createLeave(form)).unwrap();
      setShowModal(false); setForm(EMPTY);
    } catch (e) { setError(e || 'Failed to submit leave.'); }
    finally { setSaving(false); }
  };

  const approve = async (id) => { await dispatch(updateLeaveStatus({ id, status: 'Approved' })).unwrap().catch(() => {}); };
  const reject  = async (id) => { await dispatch(updateLeaveStatus({ id, status: 'Rejected' })).unwrap().catch(() => {}); };
  const remove  = async (id) => {
    if (!window.confirm('Delete this leave request?')) return;
    await dispatch(deleteLeave(id)).unwrap().catch(() => {});
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee name…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filterStatus} onChange={e => setFStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">All Status</option>
          {STATUS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={applyFilter} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl">
          <Filter className="w-3.5 h-3.5" /> Filter
        </button>
        <button onClick={resetFilter} className="text-sm text-gray-500 px-2 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Reset</button>
        <button onClick={() => { setForm(EMPTY); setError(''); setShowModal(true); }}
          className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-blue-50 rounded-xl p-2.5"><Calendar className="w-5 h-5 text-blue-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Leave Management</h2>
            <p className="text-xs text-gray-400">Manage employee leave requests</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{leaves.length} request{leaves.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Emp ID','Employee','Department','Leave Type','From','To','Days','Reason','Status','Action'].map(h =>
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading…</td></tr>}
              {!loading && leaves.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-gray-400">No leave requests found.</td></tr>}
              {leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-700 font-semibold">{l.employeeId}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                        {l.employeeName?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800 whitespace-nowrap">{l.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{l.department}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.fromDate ? new Date(l.fromDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.toDate ? new Date(l.toDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{l.days}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{l.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[l.status]}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {l.status === 'Pending' && (
                        <>
                          <button onClick={() => approve(l._id)} title="Approve"
                            className="text-emerald-500 hover:text-emerald-700 transition">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => reject(l._id)} title="Reject"
                            className="text-red-400 hover:text-red-600 transition">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => remove(l._id)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={leaves.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Apply Leave</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)} className={cls}>
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type *</label>
                <select value={form.leaveType} onChange={e => set('leaveType', e.target.value)} className={cls}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From *</label>
                  <input type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To *</label>
                  <input type="date" value={form.toDate} onChange={e => set('toDate', e.target.value)} className={cls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea value={form.reason} onChange={e => set('reason', e.target.value)}
                  rows={3} className={`${cls} resize-none`} placeholder="Reason for leave…" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                {saving ? 'Submitting…' : 'Submit Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
