import { useState, useEffect } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import api from '../../../api/axios';

const TYPES = ['Per KM', 'Flat', 'Per Ton', 'Per Day'];
const emptyForm = { name: '', type: 'Per KM', rate: '', zone: '', status: 'Active' };

const PricingRules = () => {
  const [rules, setRules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/pricing').then(r => setRules(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = r => { setEditing(r); setForm({ name: r.name, type: r.type, rate: r.rate, zone: r.zone, status: r.status }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.rate || !form.zone) { setError('Name, rate and zone are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/pricing/${editing._id}`, form);
      } else {
        await api.post('/pricing', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this pricing rule?')) return;
    await api.delete(`/pricing/${id}`).catch(() => {});
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-amber-50 rounded-xl p-2.5"><Tag className="w-5 h-5 text-amber-700" /></div>
          <h2 className="font-bold text-gray-800">Pricing Rules</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Rule Name', 'Type', 'Rate', 'Zone', 'Status', 'Actions'].map(h => <th key={h} className="px-6 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No pricing rules yet. Add one to get started.</td></tr>
              )}
              {rules.map(r => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{r.name}</td>
                  <td className="px-6 py-4 text-gray-500">{r.type}</td>
                  <td className="px-6 py-4 font-semibold text-blue-700">₹{r.rate}</td>
                  <td className="px-6 py-4 text-gray-500">{r.zone}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(r._id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">{editing ? 'Edit Rule' : 'Add Pricing Rule'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Base Rate — Truck" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                  <input type="number" min="0" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                <input value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. All India, South India" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">{saving ? 'Saving…' : 'Save Rule'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingRules;
