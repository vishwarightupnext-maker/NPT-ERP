import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react';
import { fetchExpenses, createExpense, updateExpense, deleteExpense } from '../../../../store/slices/tripExpenseSlice';
import Pagination from '../../../../components/Pagination';

export const CATEGORIES = ['Diesel Advance', 'Diesel Expense', 'Cash Advance', 'Driver Cash', 'Toll', 'Food', 'Miscellaneous'];

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { category: CATEGORIES[0], amount: '', liters: '', odometerKm: '', date: today(), dispatchNo: '', driverName: '', notes: '' };
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const Field = ({ label, children }) => (
  <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>
);

export default function ExpenseTrackTab({ vehicleId, vehicle }) {
  const dispatch = useDispatch();
  const { list: expenses, loading } = useSelector(s => s.tripExpense);

  const defaultDriverName = vehicle?.driverAssignment?.driverName || '';

  const [form, setForm] = useState({ ...emptyForm, driverName: defaultDriverName });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchExpenses({ vehicleId })); }, [vehicleId, dispatch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const resetForm = () => { setForm({ ...emptyForm, driverName: defaultDriverName }); setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      if (editingId) await dispatch(updateExpense({ id: editingId, ...form })).unwrap();
      else await dispatch(createExpense({ vehicleId, ...form })).unwrap();
      resetForm();
    } catch (err) { setError(err || 'Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const openEdit = (e) => {
    setEditingId(e._id);
    setForm({
      category: e.category, amount: String(e.amount), liters: String(e.liters || ''),
      odometerKm: String(e.odometerKm || ''), date: e.date ? e.date.slice(0, 10) : today(),
      dispatchNo: e.dispatchNo || '', driverName: e.driverName || '', notes: e.notes || '',
    });
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense entry?')) return;
    await dispatch(deleteExpense(id)).unwrap().catch(() => {});
  };

  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">{editingId ? 'Edit Entry' : 'Add Expense Entry'} — {vehicle?.registrationNo}</h3>
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Amount (₹)">
            <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Date">
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
          </Field>
          {form.category === 'Diesel Expense' && (
            <Field label="Liters">
              <input type="number" min={0} value={form.liters} onChange={e => set('liters', e.target.value)} className={inputCls} />
            </Field>
          )}
          <Field label="Odometer (km)">
            <input type="number" min={0} value={form.odometerKm} onChange={e => set('odometerKm', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Trip / Dispatch No.">
            <input value={form.dispatchNo} onChange={e => set('dispatchNo', e.target.value)} className={inputCls} placeholder="Optional" />
          </Field>
          <Field label="Driver Name">
            <input value={form.driverName} onChange={e => set('driverName', e.target.value)} className={inputCls} placeholder="Not assigned" />
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
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-blue-50 rounded-xl p-2.5"><Wallet className="w-5 h-5 text-blue-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Expense Entries</h2>
            <p className="text-xs text-gray-400">{vehicle?.registrationNo} — all recorded expenses</p>
          </div>
          <span className="ml-auto text-sm font-semibold text-gray-700">Total: ₹{total.toLocaleString('en-IN')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Date', 'Category', 'Amount', 'Liters', 'Odometer', 'Trip', 'Driver', 'Notes', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && expenses.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">No expense entries yet.</td></tr>}
              {expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(e => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">{e.category}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.liters || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.odometerKm || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.dispatchNo || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{e.driverName || '—'}</td>
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
        <Pagination
          currentPage={currentPage}
          totalItems={expenses.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>
    </div>
  );
}
