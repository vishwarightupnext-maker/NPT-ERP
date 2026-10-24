import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Plus, X, Search, Pencil, Trash2, Filter } from 'lucide-react';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../../store/slices/hrmSlice';
import Pagination from '../../../components/Pagination';

const DEPTS  = ['Management','Operations','Driver','Finance','HR','Logistics','IT','Sales'];
const TYPES  = ['Full-Time','Part-Time','Contract','Intern'];
const FMTS   = ['On Site','Remote','Bench'];
const STATUS = ['Active','Inactive','On Leave','Terminated'];

const EMPTY = {
  name:'', email:'', phone:'', department:'Operations', designation:'',
  employmentType:'Full-Time', workFormat:'On Site', joiningDate:'',
  salary:'', status:'Active', address:'', aadhaar:'', bankAccount:'', ifsc:'',
};

const statusColor = {
  Active:     'bg-emerald-50 text-emerald-700',
  Inactive:   'bg-gray-100 text-gray-500',
  'On Leave': 'bg-blue-50 text-blue-700',
  Terminated: 'bg-red-50 text-red-700',
};
const typeColor = {
  'Full-Time':'bg-emerald-100 text-emerald-700', 'Part-Time':'bg-blue-100 text-blue-700',
  Contract:   'bg-amber-100 text-amber-700',     Intern:     'bg-violet-100 text-violet-700',
};

const cls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

const Field = ({ label, children, span }) => (
  <div className={span ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);

const EmployeeManagement = () => {
  const dispatch = useDispatch();
  const { employees, loading } = useSelector(s => s.hrm);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [search, setSearch]     = useState('');
  const [filterDept, setFDept]  = useState('');
  const [filterStat, setFStat]  = useState('');
  const [filterType, setFType]  = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchEmployees({ includeErp: true }));
  }, [dispatch]);

  const reload = (params = {}) => dispatch(fetchEmployees({ includeErp: true, ...params }));

  const applyFilter = () => reload({ dept: filterDept, status: filterStat, type: filterType, search });
  const resetFilter = () => {
    setSearch(''); setFDept(''); setFStat(''); setFType('');
    reload();
  };

  // Dropdown filters apply immediately on selection — only the free-text
  // search needs the explicit Filter button (to avoid refetching per keystroke).
  const onDeptChange = (v) => { setFDept(v); reload({ dept: v, status: filterStat, type: filterType, search }); };
  const onStatChange = (v) => { setFStat(v); reload({ dept: filterDept, status: v, type: filterType, search }); };
  const onTypeChange = (v) => { setFType(v); reload({ dept: filterDept, status: filterStat, type: v, search }); };

  const openAdd  = () => { setEditTarget(null); setForm(EMPTY); setError(''); setShowModal(true); };
  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({ ...emp, joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '', salary: emp.salary ?? '' });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and Email are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editTarget) await dispatch(updateEmployee({ id: editTarget._id, ...form, salary: Number(form.salary) || 0 })).unwrap();
      else             await dispatch(createEmployee({ ...form, salary: Number(form.salary) || 0 })).unwrap();
      setShowModal(false);
    } catch (e) { setError(e || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    await dispatch(deleteEmployee(id)).unwrap().catch(() => {});
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const sel = (k, opts) => (
    <select value={form[k]} onChange={e => set(k, e.target.value)} className={cls}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ID, email…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filterDept} onChange={e => onDeptChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="">All Departments</option>
          {DEPTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterStat} onChange={e => onStatChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="">All Status</option>
          {STATUS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => onTypeChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={applyFilter} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition">
          <Filter className="w-3.5 h-3.5" /> Filter
        </button>
        <button onClick={resetFilter} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Reset</button>
        <button onClick={openAdd} className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-emerald-50 rounded-xl p-2.5"><Users className="w-5 h-5 text-emerald-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Employee Management</h2>
            <p className="text-xs text-gray-400">All employee records</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Emp ID','Name','Department','Designation','Type','Format','Salary','Status',''].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading…</td></tr>}
              {!loading && employees.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-400">No employees found.</td></tr>}
              {employees.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(e => {
                const isErpUser = e.employeeId?.startsWith('ERP-');
                return (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-emerald-700 font-semibold">{e.employeeId}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                        {e.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 whitespace-nowrap flex items-center gap-1.5">
                          {e.name}
                          {isErpUser && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">ERP User</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{e.department}</td>
                  <td className="px-5 py-3 text-gray-500">{e.designation || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[e.employmentType] || ''}`}>{e.employmentType}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{e.workFormat}</td>
                  <td className="px-5 py-3 text-gray-700 font-medium whitespace-nowrap">
                    {e.salary ? `₹${Number(e.salary).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(e)} className="text-blue-400 hover:text-blue-600 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isErpUser ? (
                        <span title="Manage this account from User Management" className="text-gray-200 cursor-not-allowed">
                          <Trash2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <button onClick={() => handleDelete(e._id)} className="text-red-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={employees.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-800">{editTarget ? 'Edit Employee' : 'Add Employee'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name *"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Doe" className={cls} /></Field>
                <Field label="Email *"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@company.com" className={cls} /></Field>
                <Field label="Phone"><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit" className={cls} /></Field>
                <Field label="Designation"><input value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Senior Driver" className={cls} /></Field>
                <Field label="Department">{sel('department', DEPTS)}</Field>
                <Field label="Employment Type">{sel('employmentType', TYPES)}</Field>
                <Field label="Work Format">{sel('workFormat', FMTS)}</Field>
                <Field label="Status">{sel('status', STATUS)}</Field>
                <Field label="Joining Date"><input type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} className={cls} /></Field>
                <Field label="Salary (₹/month)"><input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0" className={cls} /></Field>
                <Field label="Aadhaar No."><input value={form.aadhaar} onChange={e => set('aadhaar', e.target.value)} placeholder="12-digit" className={cls} /></Field>
                <Field label="Bank Account"><input value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} className={cls} /></Field>
                <Field label="IFSC Code"><input value={form.ifsc} onChange={e => set('ifsc', e.target.value)} className={cls} /></Field>
                <Field label="Address" span>
                  <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className={`${cls} resize-none`} placeholder="Full address" />
                </Field>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                {saving ? 'Saving…' : editTarget ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
