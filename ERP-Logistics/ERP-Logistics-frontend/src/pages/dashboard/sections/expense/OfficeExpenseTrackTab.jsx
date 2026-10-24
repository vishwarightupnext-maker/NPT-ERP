import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react';
import { fetchOfficeExpenses, createOfficeExpense, updateOfficeExpense, deleteOfficeExpense } from '../../../../store/slices/officeExpenseSlice';
import CustomSelect from '../../../../components/CustomSelect';

export const CATEGORIES = [
  'Salary', 'Rent', 'Electricity', 'Internet', 'Fuel',
  'Stationery', 'Maintenance', 'Office Purchase', 'Miscellaneous',
];

const DEPARTMENT_SUGGESTIONS = ['Admin', 'Operations', 'Finance', 'HR', 'Sales', 'Fleet & Maintenance'];

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { category: CATEGORIES[0], department: '', amount: '', date: today(), paidTo: '', notes: '' };
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const Field = ({ label, children }) => (
  <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>
);

export default function OfficeExpenseTrackTab() {
  const dispatch = useDispatch();
  const { list: expenses, loading } = useSelector(s => s.officeExpense);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => { dispatch(fetchOfficeExpenses(categoryFilter ? { category: categoryFilter } : {})); }, [categoryFilter, dispatch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const resetForm = () => { setForm(emptyForm); setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      if (editingId) await dispatch(updateOfficeExpense({ id: editingId, ...form })).unwrap();
      else await dispatch(createOfficeExpense(form)).unwrap();
      resetForm();
    } catch (err) { setError(err || 'Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const openEdit = (e) => {
    setEditingId(e._id);
    setForm({
      category: e.category, department: e.department || '', amount: String(e.amount),
      date: e.date ? e.date.slice(0, 10) : today(), paidTo: e.paidTo || '', notes: e.notes || '',
    });
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense entry?')) return;
    await dispatch(deleteOfficeExpense(id)).unwrap().catch(() => {});
  };

  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">{editingId ? 'Edit Entry' : 'Add Office Expense'}</h3>
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Field label="Expense Type">
            <CustomSelect value={form.category} onChange={val => set('category', val)}
              options={CATEGORIES.map(c => ({ value: c, label: c }))} className={inputCls} />
          </Field>
          <Field label="Amount (₹)">
            <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Date">
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Department">
            <input list="dept-suggestions" value={form.department} onChange={e => set('department', e.target.value)} className={inputCls} placeholder="e.g. Operations" />
            <datalist id="dept-suggestions">
              {DEPARTMENT_SUGGESTIONS.map(d => <option key={d} value={d} />)}
            </datalist>
          </Field>
          <Field label="Paid To">
            <input value={form.paidTo} onChange={e => set('paidTo', e.target.value)} className={inputCls} placeholder="Optional" />
          </Field>
          <Field label="Notes">
            <input value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} placeholder="Optional" />
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Entry'}
          </button>
          {editingId && <button onClick={resetForm} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-wrap">
          <div className="bg-blue-50 rounded-xl p-2.5"><Wallet className="w-5 h-5 text-blue-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Office Expenses</h2>
            <p className="text-xs text-gray-400">All recorded office expense entries</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-48">
              <CustomSelect value={categoryFilter} onChange={setCategoryFilter}
                options={CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="All Types" />
            </div>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Total: ₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Date', 'Type', 'Department', 'Amount', 'Paid To', 'Notes', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && expenses.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No expense entries yet.</td></tr>}
              {expenses.map(e => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">{e.category}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.department || '—'}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.paidTo || '—'}</td>
                  <td className="px-5 py-4 text-gray-400 max-w-[160px] truncate">{e.notes || '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(e)} className="text-blue-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(e._id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
