import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HandshakeIcon, CheckCircle2, XCircle, Plus, X } from 'lucide-react';
import { fetchCustomers, createCustomer, updateCustomerStatus } from '../../../store/slices/customersSlice';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Pending: 'bg-amber-50 text-amber-700',
};

const TYPES = ['Customer', 'Consignor', 'Consignee'];
const emptyForm = { name: '', type: 'Customer', gstNumber: '' };

const CustomerApproval = () => {
  const dispatch = useDispatch();
  const { list: customers } = useSelector(s => s.customers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchCustomers()); }, [dispatch]);

  const handleStatusUpdate = async (id, status) => {
    await dispatch(updateCustomerStatus({ id, status })).unwrap().catch(() => {});
    dispatch(fetchCustomers());
  };

  const handleAdd = async () => {
    if (!form.name) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await dispatch(createCustomer(form)).unwrap();
      setShowModal(false);
      setForm(emptyForm);
      dispatch(fetchCustomers());
    } catch (err) {
      setError(err || 'Failed to add.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setShowModal(true); setError(''); setForm(emptyForm); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-green-50 rounded-xl p-2.5"><HandshakeIcon className="w-5 h-5 text-green-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Customer / Consignor / Consignee Approval</h2>
            <p className="text-xs text-gray-400">Approve entities before they can transact</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Name', 'Type', 'GST Number', 'Status', 'Actions'].map(h => <th key={h} className="px-6 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">No customers yet. Add one to get started.</td></tr>
              )}
              {customers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{c.type}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{c.gstNumber || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    {c.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusUpdate(c._id, 'Approved')} className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleStatusUpdate(c._id, 'Rejected')} className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={customers.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">Add Customer / Consignor / Consignee</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Company or person name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 29ABCDE1234F1Z5" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">{saving ? 'Adding…' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerApproval;
