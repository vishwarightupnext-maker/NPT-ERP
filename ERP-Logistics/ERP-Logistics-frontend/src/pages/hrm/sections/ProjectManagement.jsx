import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FolderKanban, Plus, Pencil, Trash2, X, Calendar, Users, AlertCircle } from 'lucide-react';
import { fetchProjects, createProject, updateProject, deleteProject, fetchEmployees } from '../../../store/slices/hrmSlice';

const STATUS_OPTIONS = ['Planning', 'In Progress', 'Completed', 'On Hold'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

const statusColor = {
  'Planning':    'bg-blue-100 text-blue-700',
  'In Progress': 'bg-emerald-100 text-emerald-700',
  'Completed':   'bg-purple-100 text-purple-700',
  'On Hold':     'bg-yellow-100 text-yellow-700',
};
const priorityColor = {
  'High':   'bg-red-100 text-red-700',
  'Medium': 'bg-orange-100 text-orange-700',
  'Low':    'bg-gray-100 text-gray-600',
};

const empty = { name: '', description: '', status: 'Planning', priority: 'Medium', deadline: '', assignedNames: [] };

export default function ProjectManagement() {
  const dispatch = useDispatch();
  const { projects, employees, loading } = useSelector(s => s.hrm);

  const [open, setOpen]       = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [filterSt, setFilterSt] = useState('');

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchEmployees());
  }, [dispatch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(empty); setEditId(null); setError(''); setOpen(true); };
  const openEdit   = (p) => {
    setForm({
      name: p.name, description: p.description || '',
      status: p.status, priority: p.priority,
      deadline: p.deadline ? p.deadline.slice(0, 10) : '',
      assignedNames: p.assignedNames || [],
    });
    setEditId(p._id); setError(''); setOpen(true);
  };
  const close = () => { setOpen(false); setEditId(null); };

  const toggleEmployee = (name) => {
    setForm(f => ({
      ...f,
      assignedNames: f.assignedNames.includes(name)
        ? f.assignedNames.filter(n => n !== name)
        : [...f.assignedNames, name],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setSaving(true); setError('');
    const body = { ...form, deadline: form.deadline || undefined };
    const res = editId
      ? await dispatch(updateProject({ id: editId, ...body }))
      : await dispatch(createProject(body));
    setSaving(false);
    if ((editId ? updateProject : createProject).fulfilled.match(res)) {
      close();
    } else {
      setError(res.payload || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    await dispatch(deleteProject(id));
  };

  const filtered = filterSt ? projects.filter(p => p.status === filterSt) : projects;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">Projects</h2>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">{projects.length}</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUS_OPTIONS].map(st => (
          <button
            key={st}
            onClick={() => setFilterSt(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterSt === st ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
            }`}
          >
            {st || 'All'}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No projects found. Create your first project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[p.status]}`}>{p.status}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColor[p.priority]}`}>{p.priority}</span>
              </div>

              {p.deadline && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <Calendar className="w-3 h-3" />
                  Deadline: {new Date(p.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}

              {p.assignedNames?.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span className="truncate">{p.assignedNames.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editId ? 'Edit Project' : 'New Project'}</h3>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Project description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500">
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500">
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => set('deadline', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Assign Employees</label>
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                  {employees.map(emp => (
                    <label key={emp._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedNames.includes(emp.name)}
                        onChange={() => toggleEmployee(emp.name)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-gray-700">{emp.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{emp.department}</span>
                    </label>
                  ))}
                  {employees.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No employees found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={close} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : (editId ? 'Update Project' : 'Create Project')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
