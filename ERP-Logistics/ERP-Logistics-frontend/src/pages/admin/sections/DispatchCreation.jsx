import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PackagePlus, Plus, X, Trash2, MapPin, Pencil, Search, Eye, Calendar, FileText } from 'lucide-react';
import { fetchDispatches, createDispatch, updateDispatch, deleteDispatch } from '../../../store/slices/dispatchSlice';
import { fetchVehicles } from '../../../store/slices/vehiclesSlice';
import { fetchDrivers } from '../../../store/slices/driversSlice';
import Pagination from '../../../components/Pagination';

const empty = {
  lrNumber: '', vehicle: '', driver: '', from: '',
  destinations: [{ name: '', noOfVehicles: 1, remarks: '' }], // Array of destination objects
  goods: '', weight: '', pieces: '',
  scheduledDate: '', liveLocation: '', remarks: '', notes: '',
};

const statusColor = {
  Pending:      'bg-amber-50 text-amber-700',
  Approved:     'bg-blue-50 text-blue-700',
  'In Transit': 'bg-violet-50 text-violet-700',
  Delivered:    'bg-green-50 text-green-700',
  Cancelled:    'bg-red-50 text-red-700',
};

const cls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const DispatchCreation = () => {
  const dispatch = useDispatch();
  const { list, loading }  = useSelector(s => s.dispatches);
  const { list: vehicles } = useSelector(s => s.vehicles);
  const { list: drivers }  = useSelector(s => s.drivers);

  const [showModal, setShowModal] = useState(false);
  const [viewDispatch, setViewDispatch] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(empty);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  // Pagination & filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    dispatch(fetchDispatches());
    dispatch(fetchVehicles());
    dispatch(fetchDrivers());
  }, [dispatch]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const addDestination = () => {
    setForm(p => ({
      ...p,
      destinations: [...p.destinations, { name: '', noOfVehicles: 1, remarks: '' }]
    }));
  };

  const updateDestination = (idx, field, val) => {
    setForm(p => {
      const updated = [...p.destinations];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...p, destinations: updated };
    });
  };

  const removeDestination = (idx) => {
    setForm(p => {
      if (p.destinations.length <= 1) return p;
      const updated = p.destinations.filter((_, i) => i !== idx);
      return { ...p, destinations: updated };
    });
  };

  // Approved vehicles for quick selection
  const approvedVehicles = vehicles.filter(v => v.status === 'Approved');

  const openEdit = d => {
    setEditingId(d._id);
    let dests = [];
    if (Array.isArray(d.destinations) && d.destinations.length > 0) {
      dests = d.destinations.map(item => {
        if (typeof item === 'string') {
          return { name: item, noOfVehicles: 1, remarks: '' };
        }
        return {
          name: item.name || item.city || '',
          noOfVehicles: item.noOfVehicles != null ? Number(item.noOfVehicles) : 1,
          remarks: item.remarks || '',
        };
      });
    } else if (d.to) {
      dests = d.to.split(' → ').map(s => ({ name: s.trim(), noOfVehicles: 1, remarks: '' })).filter(x => x.name);
    }
    if (dests.length === 0) dests = [{ name: '', noOfVehicles: 1, remarks: '' }];

    setForm({
      lrNumber: d.lrNumber || '',
      vehicle: d.vehicle || '', driver: d.driver || '',
      from: d.from || '',
      destinations: dests,
      goods: d.goods || '', weight: d.weight != null ? String(d.weight) : '',
      pieces: d.pieces != null ? String(d.pieces) : '',
      scheduledDate: d.scheduledDate ? d.scheduledDate.slice(0, 10) : '',
      liveLocation: d.liveLocation || '',
      remarks: d.remarks || '',
      notes: d.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleCreate = async () => {
    const { vehicle, driver, from, destinations, goods, scheduledDate } = form;
    const validDestinations = destinations
      .map(d => ({
        name: (d.name || '').trim(),
        noOfVehicles: Number(d.noOfVehicles) > 0 ? Number(d.noOfVehicles) : 1,
        remarks: (d.remarks || '').trim()
      }))
      .filter(d => d.name);

    if (!vehicle || !driver || !from || validDestinations.length === 0 || !goods || !scheduledDate) {
      setError('All required fields must be filled, including Driver Name and at least one destination city.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        destinations: validDestinations,
        to: validDestinations.map(d => d.name).join(' → '),
        weight: form.weight ? Number(form.weight) : 0,
        pieces: form.pieces ? Number(form.pieces) : 0,
      };
      if (editingId) {
        await dispatch(updateDispatch({ id: editingId, ...payload })).unwrap();
      } else {
        await dispatch(createDispatch(payload)).unwrap();
      }
      setShowModal(false); setForm(empty); setEditingId(null);
      dispatch(fetchDispatches());
    } catch (err) { setError(err || `Failed to ${editingId ? 'update' : 'create'} dispatch.`); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this dispatch?')) return;
    await dispatch(deleteDispatch(id)).unwrap().catch(() => {});
    dispatch(fetchDispatches());
  };

  const filteredList = list.filter(d => {
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;

    // Date range filter
    let matchesDate = true;
    if (d.scheduledDate) {
      const schDateStr = new Date(d.scheduledDate).toISOString().slice(0, 10);
      if (startDateFilter && schDateStr < startDateFilter) matchesDate = false;
      if (endDateFilter && schDateStr > endDateFilter) matchesDate = false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus && matchesDate;
    const stopsStr = Array.isArray(d.destinations)
      ? d.destinations.map(s => typeof s === 'string' ? s : `${s.name || ''} ${s.remarks || ''}`).join(' ')
      : (d.to || '');
    return matchesStatus && matchesDate && (
      (d.dispatchNo && d.dispatchNo.toLowerCase().includes(q)) ||
      (d.lrNumber && d.lrNumber.toLowerCase().includes(q)) ||
      (d.vehicle && d.vehicle.toLowerCase().includes(q)) ||
      (d.driver && d.driver.toLowerCase().includes(q)) ||
      (d.from && d.from.toLowerCase().includes(q)) ||
      (stopsStr && stopsStr.toLowerCase().includes(q)) ||
      (d.goods && d.goods.toLowerCase().includes(q)) ||
      (d.remarks && d.remarks.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Datalist for driver autocomplete */}
      <datalist id="approved-drivers-list">
        {drivers.map(dr => (
          <option key={dr._id} value={dr.name}>{dr.licenseNo ? `License: ${dr.licenseNo}` : ''}</option>
        ))}
      </datalist>

      {/* toolbar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search Dispatch No, LR No, Vehicle, Driver, Route..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-500 hidden sm:inline">From:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={e => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-gray-700 focus:outline-none"
            />
            <span className="text-gray-400">—</span>
            <span className="font-medium text-gray-500 hidden sm:inline">To:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={e => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-gray-700 focus:outline-none"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setCurrentPage(1); }}
                className="text-gray-400 hover:text-red-500 ml-1 font-bold text-xs"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <button onClick={() => { setShowModal(true); setError(''); setForm(empty); setEditingId(null); }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition shrink-0">
          <Plus className="w-4 h-4" /> New Dispatch
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-violet-50 rounded-xl p-2.5"><PackagePlus className="w-5 h-5 text-violet-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Dispatch Orders</h2>
            <p className="text-xs text-gray-400">Create, manage, and view complete dispatch details</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{filteredList.length} record{filteredList.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Dispatch No.', 'LR Number', 'Vehicle', 'Driver', 'From → Destinations', 'Goods', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && filteredList.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">No dispatches match search/filter.</td></tr>
              )}
              {filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => {
                const stopsCount = Array.isArray(d.destinations) && d.destinations.length > 0
                  ? d.destinations.length
                  : (d.to ? d.to.split(' → ').length : 1);

                return (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-violet-700">{d.dispatchNo}</td>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-700 font-semibold">{d.lrNumber || '—'}</td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{d.vehicle}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap font-medium">{d.driver}</td>
                    <td className="px-5 py-4 text-gray-700">
                      <div className="flex flex-col gap-1 min-w-[200px]">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-gray-800">
                          <span>{d.from}</span>
                          <span className="text-gray-400">→</span>
                          <span>{d.to}</span>
                          {stopsCount > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {stopsCount} Stops
                            </span>
                          )}
                        </div>
                        {Array.isArray(d.destinations) && d.destinations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {d.destinations.map((s, idx) => {
                              const stopName = typeof s === 'string' ? s : s.name;
                              const stopVehicles = typeof s === 'object' && s.noOfVehicles ? s.noOfVehicles : null;
                              const stopRemarks = typeof s === 'object' && s.remarks ? s.remarks : null;
                              if (!stopName) return null;
                              return (
                                <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md"
                                  title={stopRemarks ? `Remarks: ${stopRemarks}` : undefined}>
                                  <span className="font-semibold text-emerald-700">Stop {idx + 1}:</span>
                                  <span>{stopName}</span>
                                  {stopVehicles > 0 && <span className="text-gray-600 font-medium">({stopVehicles} veh)</span>}
                                  {stopRemarks && <span className="text-amber-700 italic max-w-[120px] truncate">— "{stopRemarks}"</span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{d.goods}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(d.scheduledDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewDispatch(d)} title="View Complete Details" className="text-indigo-600 hover:text-indigo-800 transition">
                          <Eye className="w-4 h-4" />
                        </button>
                        {d.liveLocation && (
                          <a href={d.liveLocation} target="_blank" rel="noreferrer"
                            title="Live Location" className="text-emerald-500 hover:text-emerald-700">
                            <MapPin className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => openEdit(d)} title="Edit" className="text-blue-400 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(d._id)} title="Delete" className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          totalItems={filteredList.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* VIEW COMPLETE DISPATCH DETAILS MODAL */}
      {viewDispatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-violet-100 p-2.5 rounded-xl text-violet-700">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Dispatch Order Details</h3>
                  <p className="text-xs text-gray-500 font-mono">No: {viewDispatch.dispatchNo}</p>
                </div>
              </div>
              <button onClick={() => setViewDispatch(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">Dispatch Status</span>
                <span className={`inline-block px-2.5 py-1 rounded-full font-semibold ${statusColor[viewDispatch.status]}`}>
                  {viewDispatch.status}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">LR Number</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">{viewDispatch.lrNumber || '—'}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">Vehicle Registration</span>
                <span className="font-bold text-gray-800 text-sm">{viewDispatch.vehicle}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">Driver Name (Manual Entry)</span>
                <span className="font-bold text-gray-800 text-sm">{viewDispatch.driver}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">Scheduled Date</span>
                <span className="font-medium text-gray-700">{new Date(viewDispatch.scheduledDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">Goods Description</span>
                <span className="font-medium text-gray-700">{viewDispatch.goods}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">Capacity / Weight</span>
                <span className="font-medium text-gray-700">{viewDispatch.weight ? `${viewDispatch.weight} kg` : '—'}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium block">No. of Pieces</span>
                <span className="font-medium text-gray-700">{viewDispatch.pieces || 0}</span>
              </div>
            </div>

            {/* Route & Destinations */}
            <div className="border border-gray-100 bg-emerald-50/40 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Route & Destination Stops</span>
              <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span>{viewDispatch.from}</span>
                <span className="text-gray-400">→</span>
                <span>{viewDispatch.to}</span>
              </div>

              {Array.isArray(viewDispatch.destinations) && viewDispatch.destinations.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-emerald-100">
                  {viewDispatch.destinations.map((stop, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-emerald-200/60">
                      <div>
                        <span className="font-bold text-emerald-700 mr-2">Stop {i + 1}:</span>
                        <span className="font-medium text-gray-800">{typeof stop === 'string' ? stop : stop.name}</span>
                        {typeof stop === 'object' && stop.noOfVehicles > 0 && (
                          <span className="text-gray-500 ml-2">({stop.noOfVehicles} vehicles)</span>
                        )}
                      </div>
                      {typeof stop === 'object' && stop.remarks && (
                        <span className="text-amber-700 italic max-w-[200px] truncate">"{stop.remarks}"</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live location */}
            {viewDispatch.liveLocation && (
              <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate max-w-sm">{viewDispatch.liveLocation}</span>
                </div>
                <a href={viewDispatch.liveLocation} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-700 underline hover:text-blue-900 shrink-0">
                  Open Map ↗
                </a>
              </div>
            )}

            {/* Remarks & Notes */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-semibold block">Remarks</span>
                <p className="text-gray-700 whitespace-pre-wrap">{viewDispatch.remarks || 'No remarks recorded.'}</p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1">
                <span className="text-gray-400 font-semibold block">Additional Notes</span>
                <p className="text-gray-700 whitespace-pre-wrap">{viewDispatch.notes || 'No notes added.'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setViewDispatch(null)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl text-xs transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DISPATCH MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Dispatch' : 'Create Dispatch'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="space-y-4">
              {/* LR Number */}
              <Field label="LR Number">
                <input
                  value={form.lrNumber}
                  onChange={e => set('lrNumber', e.target.value)}
                  placeholder="e.g. LR-10023"
                  className={cls}
                />
              </Field>

              {/* Vehicle dropdown */}
              <Field label="Vehicle (Reg No.)" required>
                <select value={form.vehicle} onChange={e => set('vehicle', e.target.value)} className={cls}>
                  <option value="">— Select approved vehicle —</option>
                  {approvedVehicles.map(v => (
                    <option key={v._id} value={v.registrationNo}>
                      {v.registrationNo} — {v.type} ({v.capacity})
                    </option>
                  ))}
                </select>
                {approvedVehicles.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">No approved vehicles. Get a vehicle approved first.</p>
                )}
              </Field>

              {/* Driver Name (Manual Entry allowed without restriction) */}
              <Field label="Driver Name (Manual Entry)" required>
                <input
                  type="text"
                  list="approved-drivers-list"
                  value={form.driver}
                  onChange={e => set('driver', e.target.value)}
                  placeholder="Enter driver's name directly..."
                  className={cls}
                />
                <p className="mt-1 text-[11px] text-gray-400">Type driver's name directly or pick from auto-suggestions.</p>
              </Field>

              {/* From (Origin) */}
              <Field label="From (Origin)" required>
                <input value={form.from} onChange={e => set('from', e.target.value)}
                  placeholder="Origin city" className={cls} />
              </Field>

              {/* Multiple Destinations Section */}
              <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <span>Destinations (Stops)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {form.destinations.filter(d => d.name?.trim()).length} stop(s) added
                  </span>
                </div>

                <div className="space-y-3">
                  {form.destinations.map((dest, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          Stop {idx + 1}
                        </span>
                        {form.destinations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDestination(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove stop"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Destination city */}
                        <div className="sm:col-span-8">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Destination City <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={dest.name}
                            onChange={e => updateDestination(idx, 'name', e.target.value)}
                            placeholder={`Destination city ${idx + 1}`}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>

                        {/* No. of Vehicles */}
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            No. of Vehicles
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={dest.noOfVehicles}
                            onChange={e => updateDestination(idx, 'noOfVehicles', e.target.value)}
                            placeholder="1"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>

                        {/* Stop Remarks */}
                        <div className="sm:col-span-12">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Stop Remarks / Notes
                          </label>
                          <input
                            value={dest.remarks}
                            onChange={e => updateDestination(idx, 'remarks', e.target.value)}
                            placeholder="Stop-specific remarks (e.g. Unload at Gate 2)"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addDestination}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-3.5 py-2 rounded-xl transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Destination
                </button>
              </div>

              {/* Goods */}
              <Field label="Goods Description" required>
                <input value={form.goods} onChange={e => set('goods', e.target.value)}
                  placeholder="e.g. Electronics, Furniture" className={cls} />
              </Field>

              {/* Weight / Pieces / Date */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Capacity">
                  <select value={form.weight} onChange={e => set('weight', e.target.value)} className={cls}>
                    <option value="">Select</option>
                    {[50,100,150,200,250,300,500,750,1000].map(v =>
                      <option key={v} value={v}>{v} kg</option>)}
                  </select>
                </Field>
                <Field label="No. of Pieces">
                  <input type="number" value={form.pieces} onChange={e => set('pieces', e.target.value)}
                    placeholder="0" min={0} className={cls} />
                </Field>
                <Field label="Scheduled Date" required>
                  <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)}
                    className={cls} />
                </Field>
              </div>

              {/* Live Location */}
              <Field label="Live Location Link">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={form.liveLocation} onChange={e => set('liveLocation', e.target.value)}
                    placeholder="Paste Google Maps or tracking URL…"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                </div>
              </Field>

              {/* Remarks */}
              <Field label="Remarks">
                <input value={form.remarks} onChange={e => set('remarks', e.target.value)}
                  placeholder="General remarks for this dispatch..." className={cls} />
              </Field>

              {/* Notes */}
              <Field label="Additional Notes">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} placeholder="Additional notes…"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setEditingId(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                {saving ? (editingId ? 'Updating…' : 'Creating…') : (editingId ? 'Update Dispatch' : 'Create Dispatch')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchCreation;
