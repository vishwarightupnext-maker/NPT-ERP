import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Map, Plus, X, Trash2 } from 'lucide-react';
import { fetchRoutes, createRoute, deleteRoute } from '../../../store/slices/routeSlice';

const empty = { routeName: '', from: '', to: '', distance: '', estimatedHours: '', vehicleType: '', waypoints: '', notes: '' };

const RoutePlanning = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.routes);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchRoutes()); }, [dispatch]);

  const handleCreate = async () => {
    if (!form.routeName || !form.from || !form.to) { setError('Route name, from and to are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        waypoints: form.waypoints ? form.waypoints.split(',').map(w => w.trim()).filter(Boolean) : [],
      };
      await dispatch(createRoute(payload)).unwrap();
      setShowModal(false); setForm(empty);
      dispatch(fetchRoutes());
    } catch (err) { setError(err || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this route?')) return;
    await dispatch(deleteRoute(id)).unwrap().catch(() => {});
    dispatch(fetchRoutes());
  };

  const inp = (key, label, type = 'text', ph = '') => (
    <div key={key}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={ph} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setShowModal(true); setError(''); setForm(empty); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Add Route
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-blue-50 rounded-xl p-2.5"><Map className="w-5 h-5 text-blue-700" /></div>
          <div><h2 className="font-bold text-gray-800">Route Planning</h2>
            <p className="text-xs text-gray-400">Define and manage transport routes</p></div>
          <span className="ml-auto text-xs text-gray-400">{list.length} route{list.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Route Name', 'From → To', 'Distance', 'Est. Hours', 'Vehicle Type', 'Waypoints', ''].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No routes yet.</td></tr>}
              {list.map(r => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-800">{r.routeName}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{r.from} → {r.to}</td>
                  <td className="px-5 py-4 text-gray-500">{r.distance ? `${r.distance} km` : '—'}</td>
                  <td className="px-5 py-4 text-gray-500">{r.estimatedHours ? `${r.estimatedHours} hrs` : '—'}</td>
                  <td className="px-5 py-4 text-gray-500">{r.vehicleType || '—'}</td>
                  <td className="px-5 py-4 text-gray-400 text-xs">{r.waypoints?.join(' → ') || '—'}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleDelete(r._id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">Add Route</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-4">
              {inp('routeName', 'Route Name *', 'text', 'e.g. Mumbai - Pune Express')}
              <div className="grid grid-cols-2 gap-4">
                {inp('from', 'From *', 'text', 'Origin city')}
                {inp('to', 'To *', 'text', 'Destination city')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {inp('distance', 'Distance (km)', 'number', '0')}
                {inp('estimatedHours', 'Est. Hours', 'number', '0')}
              </div>
              {inp('vehicleType', 'Vehicle Type', 'text', 'e.g. Truck, Mini Van')}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waypoints <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input type="text" value={form.waypoints} onChange={e => setForm(p => ({ ...p, waypoints: e.target.value }))}
                  placeholder="Pune, Satara, Kolhapur" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              {inp('notes', 'Notes', 'text', 'Any special instructions')}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                {saving ? 'Saving…' : 'Save Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanning;
