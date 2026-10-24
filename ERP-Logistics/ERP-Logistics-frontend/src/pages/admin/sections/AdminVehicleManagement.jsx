import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Truck, Plus, X, Calendar, Clock, Pencil, User,
  AlertTriangle, RefreshCw, Trash2, Wrench, FileText,
} from 'lucide-react';
import {
  fetchVehicles, createVehicle, updateVehicle, deleteVehicle,
  uploadVehicleDocument, addVehicleService, assignDriver, updateVehicleSlot,
  fetchComplianceAlerts, fetchVehicleOverview,
} from '../../../store/slices/vehiclesSlice';
import { fetchDrivers } from '../../../store/slices/driversSlice';
import { fileHref } from '../../../utils/fileUrl';
import CustomSelect from '../../../components/CustomSelect';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Pending:  'bg-amber-50 text-amber-700',
};

const availabilityColor = {
  Available:           'bg-emerald-50 text-emerald-700',
  'On Trip':           'bg-blue-50 text-blue-700',
  'Under Maintenance': 'bg-orange-50 text-orange-700',
  Inactive:            'bg-gray-100 text-gray-500',
};

const complianceColor = {
  Valid:           'bg-emerald-50 text-emerald-700',
  'Expiring Soon': 'bg-amber-50 text-amber-700',
  Expired:         'bg-red-50 text-red-700',
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

export const VEHICLE_TYPES  = ['32 Feet Truck', 'Truck', 'Mini Truck', 'Lorry', 'Trailer', 'Container', 'Tanker'];
const FUEL_TYPES     = ['Diesel', 'Petrol', 'CNG', 'Electric'];
const VEHICLE_STATUS = ['Active', 'Inactive', 'Under Maintenance'];
const TIME_SLOTS = [
  '6:00 AM – 10:00 AM', '10:00 AM – 2:00 PM',
  '2:00 PM – 6:00 PM',  '6:00 PM – 10:00 PM',
];

const DOC_TYPES = [
  { key: 'rc',        label: 'RC Details',            numberField: 'rcDetails',            hasExpiry: false },
  { key: 'insurance', label: 'Insurance',              numberField: 'insurance',            hasExpiry: true, statusField: 'insuranceExpiryStatus', expiryField: 'insuranceExpiry' },
  { key: 'permit',    label: 'Permit',                 numberField: 'permit',               hasExpiry: true, statusField: 'permitExpiryStatus',    expiryField: 'permitExpiry' },
  { key: 'fitness',   label: 'Fitness Certificate',    numberField: 'fitnessCertificate',   hasExpiry: true, statusField: 'fitnessExpiryStatus',   expiryField: 'fitnessExpiry' },
  { key: 'pollution', label: 'Pollution Certificate',  numberField: 'pollutionCertificate', hasExpiry: true, statusField: 'pollutionExpiryStatus', expiryField: 'pollutionExpiry' },
];

const emptyForm = {
  registrationNo: '', type: VEHICLE_TYPES[0], capacity: '', capacityTons: '',
  fuelType: FUEL_TYPES[0],
  rcDetails: '', insurance: '', insuranceExpiry: '', permit: '', permitExpiry: '',
  fitnessCertificate: '', fitnessExpiry: '', pollutionCertificate: '', pollutionExpiry: '',
  vehicleStatus: 'Active', owner: '',
};
const emptyFiles = { rcDoc: null, insuranceDoc: null, permitDoc: null, fitnessDoc: null, pollutionDoc: null };

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const Badge = ({ color, children }) => (
  <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${color || 'bg-gray-100 text-gray-500'}`}>{children}</span>
);

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const driverApprovalColor = {
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Pending:  'bg-amber-50 text-amber-700',
};

const emptyServiceForm = { date: '', description: '', cost: '', odometerKm: '', serviceCenter: '' };

const AdminVehicleManagement = () => {
  const dispatch = useDispatch();
  const { list: vehicles, loading, complianceAlerts, overview } = useSelector(s => s.vehicles);
  const { list: drivers } = useSelector(s => s.drivers);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = Add mode, else id of vehicle being edited
  const [form, setForm]           = useState(emptyForm);
  const [files, setFiles]         = useState(emptyFiles);
  const [driverForm, setDriverForm] = useState('');
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const [assignVehicleId, setAssignVehicleId] = useState(null);
  const [assignForm, setAssignForm]           = useState('');
  const [slotForm, setSlotForm]               = useState({ date: '', time: TIME_SLOTS[0], notes: '' });
  const [assignError, setAssignError]         = useState('');
  const [assignSaving, setAssignSaving]       = useState(false);

  const [detailVehicle, setDetailVehicle] = useState(null);
  const [activeTab, setActiveTab]         = useState('overview');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [renewDoc, setRenewDoc]       = useState(null); // { docType, number, expiryDate, file }
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);

  const assignVehicle  = vehicles.find(v => v._id === assignVehicleId);
  const approvedDrivers = drivers.filter(d => d.status === 'Approved');

  useEffect(() => {
    dispatch(fetchVehicles());
    dispatch(fetchDrivers());
    dispatch(fetchComplianceAlerts());
  }, [dispatch]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const onFile = (key, file) => setFiles(f => ({ ...f, [key]: file }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm); setFiles(emptyFiles); setDriverForm('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditingId(v._id);
    setForm({
      registrationNo: v.registrationNo || '',
      type: v.type || VEHICLE_TYPES[0],
      capacity: v.capacity || '',
      capacityTons: v.capacityTons || '',
      fuelType: v.fuelType || FUEL_TYPES[0],
      rcDetails: v.rcDetails || '',
      insurance: v.insurance || '',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '',
      permit: v.permit || '',
      permitExpiry: v.permitExpiry ? v.permitExpiry.slice(0, 10) : '',
      fitnessCertificate: v.fitnessCertificate || '',
      fitnessExpiry: v.fitnessExpiry ? v.fitnessExpiry.slice(0, 10) : '',
      pollutionCertificate: v.pollutionCertificate || '',
      pollutionExpiry: v.pollutionExpiry ? v.pollutionExpiry.slice(0, 10) : '',
      vehicleStatus: v.vehicleStatus || 'Active',
      owner: v.owner || '',
    });
    setFiles(emptyFiles);
    setDriverForm(v.driverAssignment?.driver || '');
    setError('');
    setShowModal(true);
  };

  const handleAdd = async () => {
    const required = ['registrationNo', 'type', 'capacity', 'fuelType', 'rcDetails', 'insurance', 'permit', 'pollutionCertificate', 'owner'];
    if (required.some(k => !String(form[k]).trim())) { setError('All required fields must be filled.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const created = await dispatch(createVehicle(fd)).unwrap();

      if (driverForm) {
        const driverName = drivers.find(d => d._id === driverForm)?.name || '';
        await dispatch(assignDriver({ id: created._id, driverId: driverForm, driverName })).unwrap().catch(() => {});
      }

      setShowModal(false);
      setForm(emptyForm); setFiles(emptyFiles); setDriverForm('');
      dispatch(fetchVehicles());
      dispatch(fetchComplianceAlerts());
    } catch (err) {
      setError(err || 'Failed to add vehicle.');
    } finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    const required = ['registrationNo', 'type', 'capacity', 'fuelType', 'rcDetails', 'insurance', 'permit', 'pollutionCertificate', 'owner'];
    if (required.some(k => !String(form[k]).trim())) { setError('All required fields must be filled.'); return; }
    setSaving(true); setError('');
    try {
      await dispatch(updateVehicle({ id: editingId, ...form })).unwrap();

      const current = vehicles.find(v => v._id === editingId);
      const currentDriverId = current?.driverAssignment?.driver || '';
      if ((driverForm || '') !== (currentDriverId || '')) {
        const driverName = drivers.find(d => d._id === driverForm)?.name || '';
        await dispatch(assignDriver({ id: editingId, driverId: driverForm || null, driverName })).unwrap().catch(() => {});
      }

      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm); setDriverForm('');
      dispatch(fetchVehicles());
      dispatch(fetchComplianceAlerts());
    } catch (err) {
      setError(err || 'Failed to update vehicle.');
    } finally { setSaving(false); }
  };

  const openAssign = (v) => {
    setAssignVehicleId(v._id);
    setAssignForm(v.driverAssignment?.driver || '');
    setSlotForm({
      date:  v.slot?.date ? v.slot.date.slice(0, 10) : '',
      time:  v.slot?.time || TIME_SLOTS[0],
      notes: v.slot?.notes || '',
    });
    setAssignError('');
  };

  const handleSaveAssign = async () => {
    setAssignSaving(true); setAssignError('');
    try {
      const current = assignVehicle?.driverAssignment?.driver || '';
      if ((assignForm || '') !== (current || '')) {
        const driverName = drivers.find(d => d._id === assignForm)?.name || '';
        await dispatch(assignDriver({ id: assignVehicleId, driverId: assignForm || null, driverName })).unwrap();
      }

      const currentSlotDate  = assignVehicle?.slot?.date ? assignVehicle.slot.date.slice(0, 10) : '';
      const currentSlotTime  = assignVehicle?.slot?.time || '';
      const currentSlotNotes = assignVehicle?.slot?.notes || '';
      if (slotForm.date && (slotForm.date !== currentSlotDate || slotForm.time !== currentSlotTime || slotForm.notes !== currentSlotNotes)) {
        await dispatch(updateVehicleSlot({ id: assignVehicleId, slot: slotForm })).unwrap();
      }

      setAssignVehicleId(null);
      dispatch(fetchVehicles());
    } catch (err) {
      setAssignError(err || 'Failed to save driver assignment.');
    } finally { setAssignSaving(false); }
  };

  const openDetail = (v) => {
    setDetailVehicle(v);
    setServiceForm(emptyServiceForm);
    dispatch(fetchVehicleOverview(v._id));
  };

  const handleVehicleStatusChange = async (id, vehicleStatus) => {
    const updated = await dispatch(updateVehicle({ id, vehicleStatus })).unwrap().catch(() => null);
    if (updated) setDetailVehicle(updated);
    dispatch(fetchVehicles());
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return;
    await dispatch(deleteVehicle(id)).unwrap().catch(() => {});
    setDetailVehicle(null);
  };

  const handleRenewDoc = async () => {
    if (!renewDoc?.file) return;
    const fd = new FormData();
    fd.append('docType', renewDoc.docType);
    fd.append('file', renewDoc.file);
    if (renewDoc.number) fd.append('number', renewDoc.number);
    if (renewDoc.expiryDate) fd.append('expiryDate', renewDoc.expiryDate);
    const updated = await dispatch(uploadVehicleDocument({ id: detailVehicle._id, formData: fd })).unwrap().catch(() => null);
    if (updated) { setDetailVehicle(updated); dispatch(fetchVehicles()); dispatch(fetchComplianceAlerts()); }
    setRenewDoc(null);
  };

  const handleAddService = async () => {
    if (!serviceForm.description) return;
    const updated = await dispatch(addVehicleService({ id: detailVehicle._id, ...serviceForm })).unwrap().catch(() => null);
    if (updated) setDetailVehicle(updated);
    setServiceForm(emptyServiceForm);
  };

  return (
    <div className="space-y-4">
      {complianceAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Document Expiry Alerts
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {complianceAlerts.map((a, i) => (
              <p key={i} className="text-xs text-amber-700">
                <span className="font-medium">{a.registrationNo}</span> — {a.docType} is{' '}
                <span className="font-semibold">{a.status.toLowerCase()}</span>
                {a.expiryDate && ` (${new Date(a.expiryDate).toLocaleDateString('en-IN')})`}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-sky-50 rounded-xl p-2.5"><Truck className="w-5 h-5 text-sky-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Vehicle Management</h2>
            <p className="text-xs text-gray-400">Add, edit, and track vehicles — Super Admin reviews approvals</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Reg No.', 'Type', 'Capacity', 'Fuel', 'Owner', 'Driver', 'Slot', 'Order Status', 'Approval', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && vehicles.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">No vehicles added yet.</td></tr>
              )}
              {vehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(v => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">
                    <button onClick={() => openDetail(v)} className="hover:underline text-blue-700">{v.registrationNo}</button>
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.type}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.capacity}{v.capacityTons ? ` (${v.capacityTons}T)` : ''}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.fuelType}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.owner}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openAssign(v)}
                      title="Click to change driver"
                      className="flex items-center gap-1.5 hover:bg-gray-100 rounded-lg px-1.5 py-1 -mx-1.5 -my-1 transition"
                    >
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {v.driverAssignment?.driverName ? (
                        <div className="text-left">
                          <p className="text-xs font-medium text-gray-700">{v.driverAssignment.driverName}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${driverApprovalColor[v.driverAssignment.status]}`}>{v.driverAssignment.status}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">Unassigned</span>}
                    </button>
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(v)} title="Edit vehicle details"
                        className="text-blue-400 hover:text-blue-600 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(v._id)} title="Delete vehicle"
                        className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Truck Number">
                <input value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)}
                  className={inputCls} placeholder="e.g. KA-01-AB-1234" />
              </Field>

              <Field label="Vehicle Type">
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                  {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Capacity">
                <select value={form.capacity} onChange={e => set('capacity', e.target.value)} className={inputCls}>
                  <option value="">— Select capacity —</option>
                  {['50 kg', '100 kg', '150 kg', '1 Ton', '5 Tons', '9 Tons (32 ft)', '15 Tons'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Capacity (Tons, numeric)">
                <input type="number" min={0} value={form.capacityTons} onChange={e => set('capacityTons', e.target.value)}
                  className={inputCls} placeholder="e.g. 9" />
              </Field>

              <Field label="Fuel Type">
                <select value={form.fuelType} onChange={e => set('fuelType', e.target.value)} className={inputCls}>
                  {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>

              <Field label="Owner">
                <input value={form.owner} onChange={e => set('owner', e.target.value)}
                  className={inputCls} placeholder="Owner or company name" />
              </Field>

              <Field label="Vehicle Status">
                <select value={form.vehicleStatus} onChange={e => set('vehicleStatus', e.target.value)} className={inputCls}>
                  {VEHICLE_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              <Field label={<span className="flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" /> Driver</span>}>
                <CustomSelect
                  value={driverForm}
                  onChange={setDriverForm}
                  options={approvedDrivers.map(d => ({ value: d._id, label: `${d.name} (${d.licenseNo})` }))}
                  placeholder="— Unassigned —"
                  className={inputCls}
                />
              </Field>

              <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vehicle Documents</p>
              </div>

              <Field label="RC Details">
                <input value={form.rcDetails} onChange={e => set('rcDetails', e.target.value)}
                  className={`${inputCls} ${editingId ? '' : 'mb-2'}`} placeholder="RC number" />
                {!editingId && <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFile('rcDoc', e.target.files?.[0])} />}
              </Field>

              <div>
                <Field label="Insurance">
                  <input value={form.insurance} onChange={e => set('insurance', e.target.value)}
                    className={`${inputCls} mb-2`} placeholder="Policy number" />
                </Field>
                <input type="date" value={form.insuranceExpiry} onChange={e => set('insuranceExpiry', e.target.value)} className={`${inputCls} ${editingId ? '' : 'mb-2'}`} />
                {!editingId && <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFile('insuranceDoc', e.target.files?.[0])} />}
              </div>

              <div>
                <Field label="Permit">
                  <input value={form.permit} onChange={e => set('permit', e.target.value)}
                    className={`${inputCls} mb-2`} placeholder="Permit number" />
                </Field>
                <input type="date" value={form.permitExpiry} onChange={e => set('permitExpiry', e.target.value)} className={`${inputCls} ${editingId ? '' : 'mb-2'}`} />
                {!editingId && <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFile('permitDoc', e.target.files?.[0])} />}
              </div>

              <div>
                <Field label="Fitness Certificate">
                  <input value={form.fitnessCertificate} onChange={e => set('fitnessCertificate', e.target.value)}
                    className={`${inputCls} mb-2`} placeholder="Certificate number" />
                </Field>
                <input type="date" value={form.fitnessExpiry} onChange={e => set('fitnessExpiry', e.target.value)} className={`${inputCls} ${editingId ? '' : 'mb-2'}`} />
                {!editingId && <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFile('fitnessDoc', e.target.files?.[0])} />}
              </div>

              <div>
                <Field label="Pollution Certificate">
                  <input value={form.pollutionCertificate} onChange={e => set('pollutionCertificate', e.target.value)}
                    className={`${inputCls} mb-2`} placeholder="Certificate number" />
                </Field>
                <input type="date" value={form.pollutionExpiry} onChange={e => set('pollutionExpiry', e.target.value)} className={`${inputCls} ${editingId ? '' : 'mb-2'}`} />
                {!editingId && <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFile('pollutionDoc', e.target.files?.[0])} />}
              </div>

            </div>

            {!editingId && (
              <p className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                This vehicle will be submitted for Super Admin approval.
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={editingId ? handleSaveEdit : handleAdd} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
                {saving ? 'Saving…' : (editingId ? 'Save Changes' : 'Submit for Approval')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver modal */}
      {assignVehicleId && assignVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800">Assign Driver</h3>
              <button onClick={() => setAssignVehicleId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Vehicle: <span className="font-semibold text-gray-600">{assignVehicle.registrationNo}</span>
            </p>

            {assignError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{assignError}</p>}

            {approvedDrivers.length === 0 && (
              <p className="mb-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                No approved drivers available yet. Add a driver and wait for Super Admin approval first.
              </p>
            )}

            <div className="space-y-4">
              <Field label={<span className="flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" /> Driver</span>}>
                <CustomSelect
                  value={assignForm}
                  onChange={setAssignForm}
                  options={approvedDrivers.map(d => ({ value: d._id, label: `${d.name} (${d.licenseNo})` }))}
                  placeholder="— Unassigned —"
                  className={inputCls}
                />
              </Field>

              <Field label={<span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Date</span>}>
                <input type="date" value={slotForm.date}
                  onChange={e => setSlotForm(p => ({ ...p, date: e.target.value }))}
                  className={inputCls} />
              </Field>

              <Field label={<span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /> Time Slot</span>}>
                <CustomSelect
                  value={slotForm.time}
                  onChange={val => setSlotForm(p => ({ ...p, time: val }))}
                  options={TIME_SLOTS.map(t => ({ value: t, label: t }))}
                  placeholder="— Select time slot —"
                  className={inputCls}
                />
              </Field>
            </div>

            <p className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Changing the driver resets the assignment to Pending — Super Admin must re-approve it.
            </p>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setAssignVehicleId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveAssign} disabled={assignSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
                {assignSaving ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail modal */}
      {detailVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">{detailVehicle.registrationNo}</h3>
                <p className="text-xs text-gray-400">{detailVehicle.type} · {detailVehicle.capacity}</p>
              </div>
              <button onClick={() => setDetailVehicle(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <Badge color={statusColor[detailVehicle.status]}>{detailVehicle.status}</Badge>
              {overview?.availabilityStatus && <Badge color={availabilityColor[overview.availabilityStatus]}>{overview.availabilityStatus}</Badge>}
              <select
                value={detailVehicle.vehicleStatus}
                onChange={e => handleVehicleStatusChange(detailVehicle._id, e.target.value)}
                className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1"
              >
                {VEHICLE_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
              {[
                ['Owner', detailVehicle.owner],
                ['Fuel Type', detailVehicle.fuelType],
                ['Capacity', `${detailVehicle.capacity}${detailVehicle.capacityTons ? ` (${detailVehicle.capacityTons} Tons)` : ''}`],
                ['Order Status', detailVehicle.orderStatus || 'Created'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Documents & Compliance */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Documents & Compliance</h4>
            <div className="space-y-2 mb-5">
              {DOC_TYPES.map(({ key, label, numberField, hasExpiry, statusField, expiryField }) => {
                const number = detailVehicle[numberField];
                const expiry = hasExpiry ? detailVehicle[expiryField] : null;
                const status = hasExpiry ? detailVehicle[statusField] : null;
                const fileUrl = detailVehicle.documents?.[`${key}Copy`];
                return (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">
                        {number && <>No: {number} · </>}
                        {hasExpiry ? (expiry ? `Expires: ${new Date(expiry).toLocaleDateString('en-IN')}` : 'No expiry set') : (fileUrl ? 'On file' : 'Not uploaded')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status && <Badge color={complianceColor[status]}>{status}</Badge>}
                      {fileUrl && <a href={fileHref(fileUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:underline">View</a>}
                      <button onClick={() => setRenewDoc({ docType: key, number: number || '', expiryDate: expiry ? expiry.slice(0, 10) : '', file: null })}
                        className="text-xs font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-100 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> {fileUrl ? 'Renew' : 'Upload'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Service History */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Service History</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
              <input type="date" value={serviceForm.date} onChange={e => setServiceForm(f => ({ ...f, date: e.target.value }))} className={`${inputCls} text-xs py-2`} />
              <input value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className={`${inputCls} text-xs py-2 sm:col-span-2`} />
              <input type="number" value={serviceForm.cost} onChange={e => setServiceForm(f => ({ ...f, cost: e.target.value }))} placeholder="Cost (₹)" className={`${inputCls} text-xs py-2`} />
              <input type="number" value={serviceForm.odometerKm} onChange={e => setServiceForm(f => ({ ...f, odometerKm: e.target.value }))} placeholder="Odometer (km)" className={`${inputCls} text-xs py-2`} />
            </div>
            <div className="flex gap-2 mb-3">
              <input value={serviceForm.serviceCenter} onChange={e => setServiceForm(f => ({ ...f, serviceCenter: e.target.value }))} placeholder="Service center" className={`${inputCls} text-xs py-2 flex-1`} />
              <button onClick={handleAddService} className="shrink-0 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto mb-5">
              {detailVehicle.serviceHistory?.length ? [...detailVehicle.serviceHistory].reverse().map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700">{s.description}</p>
                    <p className="text-gray-400">{new Date(s.date).toLocaleDateString('en-IN')} {s.serviceCenter && `· ${s.serviceCenter}`} {s.odometerKm ? `· ${s.odometerKm} km` : ''}</p>
                  </div>
                  {s.cost > 0 && <span className="font-semibold text-gray-700">₹{s.cost.toLocaleString('en-IN')}</span>}
                </div>
              )) : <p className="text-xs text-gray-400">No service records yet.</p>}
            </div>

            {/* Trip History */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Trip History</h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 mb-5">
              {overview?.trips?.length ? overview.trips.map(t => (
                <div key={t._id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-mono font-semibold text-gray-600">{t.dispatchNo}</span>
                  <span className="text-gray-500">{t.from} → {t.to}</span>
                  <span className="text-gray-400">{new Date(t.scheduledDate).toLocaleDateString('en-IN')}</span>
                  <Badge color={t.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}>{t.status}</Badge>
                </div>
              )) : <p className="text-xs text-gray-400">No trip history yet.</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleDelete(detailVehicle._id)}
                className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium px-4 py-2.5 rounded-xl text-sm transition">
                <Trash2 className="w-4 h-4" /> Delete Vehicle
              </button>
              <button onClick={() => setDetailVehicle(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew/upload single document modal */}
      {renewDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[55] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Upload / Renew Document</h3>
              <button onClick={() => setRenewDoc(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Document Number">
                <input value={renewDoc.number} onChange={e => setRenewDoc(d => ({ ...d, number: e.target.value }))} className={inputCls} />
              </Field>
              {DOC_TYPES.find(dt => dt.key === renewDoc.docType)?.hasExpiry && (
                <Field label="Expiry Date">
                  <input type="date" value={renewDoc.expiryDate} onChange={e => setRenewDoc(d => ({ ...d, expiryDate: e.target.value }))} className={inputCls} />
                </Field>
              )}
              <Field label="File">
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => setRenewDoc(d => ({ ...d, file: e.target.files?.[0] }))} />
              </Field>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRenewDoc(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRenewDoc} disabled={!renewDoc.file} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVehicleManagement;
