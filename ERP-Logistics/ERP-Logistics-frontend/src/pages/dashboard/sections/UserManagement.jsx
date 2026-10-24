import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Search, X, Bell, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  fetchUsers, createUser, updateUser, deleteUser,
  approveUser, rejectUser, fetchPendingCount,
} from '../../../store/slices/usersSlice';
import Pagination from '../../../components/Pagination';

const ROLES = ['Admin'];
const emptyForm = { name: '', email: '', password: '', role: 'Admin' };

const statusBadge = {
  Active:   'bg-emerald-50 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-500',
  Pending:  'bg-amber-50 text-amber-700',
};

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const UserManagement = () => {
  const dispatch = useDispatch();
  const { list: users, pendingCount, loading } = useSelector(s => s.users);

  const [tab,       setTab]       = useState('all');   // 'all' | 'pending'
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(emptyForm);
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  /* Approve modal */
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveRole,   setApproveRole]   = useState('Admin');
  const [approveSaving, setApproveSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchPendingCount());
  }, [dispatch]);

  /* ── helpers ── */
  const pendingUsers = users.filter(u => u.status === 'Pending');
  const activeUsers  = users.filter(u => u.status !== 'Pending');

  const displayed = (tab === 'pending' ? pendingUsers : activeUsers)
    .filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  /* ── CRUD ── */
  
  const openEdit = u => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editing) {
        await dispatch(updateUser({ id: editing._id, payload: { name: form.name, role: form.role } })).unwrap();
      } else {
        if (!form.name || !form.email || !form.password) { setError('All fields are required.'); setSaving(false); return; }
        await dispatch(createUser(form)).unwrap();
      }
      setShowModal(false);
      dispatch(fetchUsers());
    } catch (err) { setError(err || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this user?')) return;
    await dispatch(deleteUser(id)).unwrap().catch(() => {});
    dispatch(fetchUsers());
  };

  /* ── Approve ── */
  const openApprove = u => { setApproveTarget(u); setApproveRole('Admin'); };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproveSaving(true);
    try {
      await dispatch(approveUser({ id: approveTarget._id, role: approveRole })).unwrap();
      dispatch(fetchUsers());
      setApproveTarget(null);
    } catch {}
    finally { setApproveSaving(false); }
  };

  const handleReject = async id => {
    if (!window.confirm('Reject and remove this user?')) return;
    await dispatch(rejectUser(id)).unwrap().catch(() => {});
    dispatch(fetchUsers());
    dispatch(fetchPendingCount());
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">

      {/* ── Pending banner ── */}
      {pendingCount > 0 && tab !== 'pending' && (
        <button
          onClick={() => setTab('pending')}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 text-left hover:bg-amber-100 transition"
        >
          <Bell className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} user{pendingCount !== 1 ? 's' : ''} waiting for approval
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Click to review pending registrations</p>
          </div>
          <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingCount}</span>
        </button>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Users
            <span className="ml-1.5 text-xs text-gray-400">({activeUsers.length})</span>
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Pending
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search users…"
          />
        </div>
    
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-800">
            {tab === 'pending' ? 'Pending Approvals' : 'All Users'}
          </h2>
          <span className="ml-auto text-xs text-gray-400">{displayed.length} user{displayed.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {(tab === 'pending'
                  ? ['Name', 'Email', 'Registered', 'Status', 'Actions']
                  : ['Name', 'Email', 'Role', 'Status', 'Actions']
                ).map(h => (
                  <th key={h} className="px-6 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && displayed.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    {tab === 'pending' ? 'No pending approvals.' : 'No users found.'}
                  </td>
                </tr>
              )}
              {displayed.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(u => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    {tab === 'pending' ? (
                      <span className="text-xs text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{u.role}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge[u.status] || ''}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tab === 'pending' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openApprove(u)}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(u._id)}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        <button onClick={() => handleDelete(u._id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={displayed.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* ── Add / Edit User Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">{editing ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Full Name" />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="Email address" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} placeholder="Password" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Approve User</h3>
              <button onClick={() => setApproveTarget(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {approveTarget.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{approveTarget.name}</p>
                <p className="text-xs text-gray-400">{approveTarget.email}</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign Role</label>
              <select
                value={approveRole}
                onChange={e => setApproveRole(e.target.value)}
                className={inputCls}
              >
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setApproveTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={approveSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {approveSaving ? 'Approving…' : 'Approve & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
