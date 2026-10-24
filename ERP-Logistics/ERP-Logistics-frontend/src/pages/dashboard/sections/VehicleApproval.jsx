import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Truck, CheckCircle2, XCircle, X,
  Calendar, Clock, ChevronRight, Check, User,
} from 'lucide-react';
import {
  fetchVehicles,
  updateVehicleApproval, updateVehicleSlot, updateVehicleOrderStatus,
  approveDriver,
} from '../../../store/slices/vehiclesSlice';
import Pagination from '../../../components/Pagination';

const ORDER_STATUSES = [
  'Created', 'Approved', 'LR Generated', 'Ready for Dispatch',
  'In Transit', 'Delivered', 'POD Completed', 'Billing Closed',
];

const TIME_SLOTS = [
  '6:00 AM – 10:00 AM', '10:00 AM – 2:00 PM',
  '2:00 PM – 6:00 PM',  '6:00 PM – 10:00 PM',
];

const approvalColor = {
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Pending:  'bg-amber-50 text-amber-700',
};

const orderStatusColor = {
  'Created':            'bg-gray-100 text-gray-600',
  'Approved':           'bg-blue-50 text-blue-700',
  'LR Generated':       'bg-indigo-50 text-indigo-700',
  'Ready for Dispatch': 'bg-violet-50 text-violet-700',
  'In Transit':         'bg-amber-50 text-amber-700',
  'Delivered':          'bg-teal-50 text-teal-700',
  'POD Completed':      'bg-green-50 text-green-700',
  'Billing Closed':     'bg-emerald-100 text-emerald-800',
};

const emptySlotForm = { date: '', time: TIME_SLOTS[0], notes: '' };

const StatusStepper = ({ vehicle, onSet }) => {
  const currentIdx = ORDER_STATUSES.indexOf(vehicle.orderStatus ?? 'Created');
  const history    = vehicle.statusHistory ?? [];
  const histEntry  = s => history.find(h => h.status === s);

  return (
    <div className="space-y-0">
      {ORDER_STATUSES.map((status, idx) => {
        const done    = idx < currentIdx;
        const current = idx === currentIdx;
        const upcoming = idx > currentIdx;
        const entry   = histEntry(status);
        const isLast  = idx === ORDER_STATUSES.length - 1;

        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => !current && onSet(status)}
                title={upcoming ? `Set to "${status}"` : undefined}
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition
                  ${done    ? 'bg-green-500 cursor-pointer hover:bg-green-600' : ''}
                  ${current ? 'bg-blue-600 ring-4 ring-blue-100 cursor-default' : ''}
                  ${upcoming ? 'bg-gray-200 hover:bg-blue-400 cursor-pointer' : ''}
                `}
              >
                {done    && <Check className="w-3.5 h-3.5 text-white" />}
                {current && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                {upcoming && <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />}
              </button>
              {!isLast && <div className={`w-0.5 h-6 mt-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
            <div className="pb-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium leading-7
                  ${done ? 'text-green-700' : current ? 'text-blue-700 font-semibold' : 'text-gray-400'}
                `}>
                  {status}
                </span>
                {current  && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Current</span>}
                {upcoming && <span className="text-xs text-gray-400 italic">click to set</span>}
              </div>
              {entry && (
                <p className="text-xs text-gray-400 -mt-1">
                  {new Date(entry.updatedAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
      <div className="pt-2 pl-10">
        {currentIdx < ORDER_STATUSES.length - 1 ? (
          <button
            onClick={() => onSet(ORDER_STATUSES[currentIdx + 1])}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            <ChevronRight className="w-4 h-4" />
            Advance to: <span className="font-semibold">{ORDER_STATUSES[currentIdx + 1]}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold">
            <Check className="w-4 h-4" /> All stages complete
          </span>
        )}
      </div>
    </div>
  );
};

const VehicleApproval = () => {
  const dispatch = useDispatch();
  const { list: vehicles } = useSelector(s => s.vehicles);

  const [slotModalId, setSlotModalId]     = useState(null);
  const [slotForm, setSlotForm]           = useState(emptySlotForm);
  const [statusModalId, setStatusModalId] = useState(null);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [error, setError]                 = useState('');
  const [saving, setSaving]               = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const slotVehicle   = vehicles.find(v => v._id === slotModalId);
  const statusVehicle = vehicles.find(v => v._id === statusModalId);

  useEffect(() => { dispatch(fetchVehicles()); }, [dispatch]);

  const handleApproval = async (id, status) => {
    await dispatch(updateVehicleApproval({ id, status })).unwrap().catch(() => {});
    dispatch(fetchVehicles());
  };

  const handleDriverApproval = async (id, status) => {
    await dispatch(approveDriver({ id, status })).unwrap().catch(() => {});
  };

  const openSlotModal = v => {
    setSlotModalId(v._id);
    setSlotForm({
      date:  v.slot?.date ? v.slot.date.slice(0, 10) : '',
      time:  v.slot?.time || TIME_SLOTS[0],
      notes: v.slot?.notes || '',
    });
    setError('');
  };

  const handleSaveSlot = async () => {
    if (!slotForm.date) { setError('Please select a date.'); return; }
    setSaving(true); setError('');
    try {
      await dispatch(updateVehicleSlot({ id: slotModalId, slot: slotForm })).unwrap();
      setSlotModalId(null);
      dispatch(fetchVehicles());
    } catch (err) {
      setError(err || 'Failed to save slot.');
    } finally { setSaving(false); }
  };

  const handleSetStatus = async status => {
    await dispatch(updateVehicleOrderStatus({ id: statusModalId, status })).unwrap().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-sky-50 rounded-xl p-2.5"><Truck className="w-5 h-5 text-sky-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Vehicle Master Approval</h2>
            <p className="text-xs text-gray-400">Review and approve vehicles submitted by Admin</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {vehicles.filter(v => v.status === 'Pending').length} pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Reg No.', 'Type', 'Capacity', 'Fuel', 'Owner', 'Driver', 'Slot', 'Order Status', 'Approval', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400 text-sm">No vehicles submitted yet.</td></tr>
              )}
              {vehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(v => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">
                    <button onClick={() => setDetailVehicle(v)} className="hover:underline text-blue-700">{v.registrationNo}</button>
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.type}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.capacity || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.fuelType || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.owner}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {v.driverAssignment?.driverName ? (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-700">{v.driverAssignment.driverName}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${approvalColor[v.driverAssignment.status]}`}>{v.driverAssignment.status}</span>
                          {v.driverAssignment.status === 'Pending' && (
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => handleDriverApproval(v._id, 'Approved')} title="Approve"
                                className="text-green-600 hover:text-green-800"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDriverApproval(v._id, 'Rejected')} title="Reject"
                                className="text-red-500 hover:text-red-700"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : <span className="text-gray-300 text-xs">Unassigned</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {v.slot?.date ? (
                      <div>
                        <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          {new Date(v.slot.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {v.slot.time}
                        </p>
                      </div>
                    ) : <span className="text-gray-300 text-xs">Not fixed</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${orderStatusColor[v.orderStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {v.orderStatus || 'Created'}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${approvalColor[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {v.status === 'Pending' && (
                        <>
                          <button onClick={() => handleApproval(v._id, 'Approved')} className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => handleApproval(v._id, 'Rejected')} className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {v.status === 'Approved' && (
                        <>
                          <button onClick={() => openSlotModal(v)} className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                            <Calendar className="w-3.5 h-3.5" /> Fix Slot
                          </button>
                          <button onClick={() => setStatusModalId(v._id)} className="flex items-center gap-1 bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                            <Clock className="w-3.5 h-3.5" /> Order Status
                          </button>
                        </>
                      )}
                      {v.status === 'Rejected' && <span className="text-gray-300 text-xs">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={vehicles.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* Vehicle Detail Modal */}
      {detailVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Vehicle Details</h3>
              <button onClick={() => setDetailVehicle(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Reg No.', detailVehicle.registrationNo],
                ['Type', detailVehicle.type],
                ['Capacity', detailVehicle.capacity],
                ['Fuel Type', detailVehicle.fuelType],
                ['Owner', detailVehicle.owner],
                ['RC Details', detailVehicle.rcDetails],
                ['Insurance', detailVehicle.insurance],
                ['Permit', detailVehicle.permit],
                ['Pollution Cert.', detailVehicle.pollutionCertificate],
                ['Vehicle Status', detailVehicle.vehicleStatus],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => setDetailVehicle(null)}
              className="w-full mt-5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Fix Slot Modal */}
      {slotModalId && slotVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800">Fix Slot</h3>
              <button onClick={() => setSlotModalId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Vehicle: <span className="font-semibold text-gray-600">{slotVehicle.registrationNo}</span>
            </p>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1 text-blue-600" />Date
                </label>
                <input type="date" value={slotForm.date} min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setSlotForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1 text-blue-600" />Time Slot
                </label>
                <select value={slotForm.time} onChange={e => setSlotForm(p => ({ ...p, time: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={slotForm.notes} onChange={e => setSlotForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Additional notes…" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSlotModalId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSaveSlot} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">{saving ? 'Saving…' : 'Confirm Slot'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Status Modal */}
      {statusModalId && statusVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800">Order Status</h3>
              <button onClick={() => setStatusModalId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Vehicle: <span className="font-semibold text-gray-600">{statusVehicle.registrationNo}</span>
              {' · '}{statusVehicle.owner}
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <StatusStepper vehicle={statusVehicle} onSet={handleSetStatus} />
            </div>
            <button onClick={() => setStatusModalId(null)}
              className="w-full mt-5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleApproval;
