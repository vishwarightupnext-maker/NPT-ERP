import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  UserCheck, Plus, X, Camera, Upload, AlertTriangle, CheckCircle2,
  XCircle, Truck, RefreshCw, Clock, FileText, FileDown,
} from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import {
  fetchDrivers, createDriver, updateDriverOperationalStatus,
  uploadDriverDocument, fetchDriverOverview, fetchComplianceAlerts,
  sendDriverOtp, verifyDriverOtp,
} from '../../../store/slices/driversSlice';
import { fetchVehicles, assignDriver } from '../../../store/slices/vehiclesSlice';
import CameraCapture from '../../../components/CameraCapture';
import { fileHref } from '../../../utils/fileUrl';
import { generateDriverProfilePDF } from '../../../utils/pdf';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Pending:  'bg-amber-50 text-amber-700',
};

const driverStatusColor = {
  Active:    'bg-emerald-50 text-emerald-700',
  Inactive:  'bg-gray-100 text-gray-500',
  Suspended: 'bg-red-50 text-red-700',
};

const complianceColor = {
  Valid:          'bg-emerald-50 text-emerald-700',
  'Expiring Soon':'bg-amber-50 text-amber-700',
  Expired:        'bg-red-50 text-red-700',
};

const DRIVER_STATUS = ['Active', 'Inactive', 'Suspended'];

const DOC_TYPES = [
  { key: 'drivingLicense',       label: 'Driving License',            hasExpiry: true,  hasNumber: true },
  { key: 'aadhaarCard',          label: 'Aadhaar Card',                hasExpiry: false, hasNumber: false },
  { key: 'panCard',              label: 'PAN Card',                    hasExpiry: false, hasNumber: false },
  { key: 'passport',             label: 'Passport (Optional)',         hasExpiry: true,  hasNumber: true },
  { key: 'medicalCertificate',   label: 'Medical Certificate',         hasExpiry: true,  hasNumber: false },
  { key: 'policeVerification',   label: 'Police Verification Cert.',   hasExpiry: false, hasNumber: false },
  { key: 'experienceCertificate',label: 'Experience Certificate',      hasExpiry: false, hasNumber: false },
];

const emptyForm = {
  name: '', dob: '', address: '', aadhaar: '', pan: '', bloodGroup: '',
  phone: '', emergencyContactName: '', emergencyContactPhone: '',
  licenseNo: '', licenseExpiry: '',
  salary: '', driverStatus: 'Active',
};

const emptyFiles = {
  photo: null, signature: null,
  drivingLicenseDoc: null, aadhaarCardDoc: null, panCardDoc: null,
  passportDoc: null, medicalCertificateDoc: null, policeVerificationDoc: null, experienceCertificateDoc: null,
};

const emptyDocMeta = { passportNumber: '', passportExpiry: '', medicalCertificateExpiry: '' };
const emptyOtp = { sent: false, code: '', verifying: false, error: '' };

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2 mb-1 col-span-full">{children}</h4>
);

const Badge = ({ color, children }) => (
  <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${color || 'bg-gray-100 text-gray-500'}`}>{children}</span>
);


const AdminDriverManagement = () => {
  const dispatch = useDispatch();
  const { list: drivers, loading, complianceAlerts, overview } = useSelector(s => s.drivers);
  const { list: vehicles } = useSelector(s => s.vehicles);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [files, setFiles]         = useState(emptyFiles);
  const [previews, setPreviews]   = useState({ photo: '', signature: '' });
  const [docMeta, setDocMeta]     = useState(emptyDocMeta);
  const [mobileOtp, setMobileOtp] = useState(emptyOtp);
  const [emgOtp, setEmgOtp]       = useState(emptyOtp);
  const [cameraTarget, setCameraTarget] = useState(null); // 'photo' | 'signature' | null
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const [detailDriver, setDetailDriver] = useState(null);
  const [assignPicker, setAssignPicker] = useState(null); // driver being assigned
  const [assignForm, setAssignForm]     = useState({ vehicleId: '' });
  const [renewDoc, setRenewDoc]         = useState(null); // { docType, file, number, expiryDate }
  const [pdfBusy, setPdfBusy]           = useState(false);

  useEffect(() => {
    dispatch(fetchDrivers());
    dispatch(fetchVehicles());
    dispatch(fetchComplianceAlerts());
  }, [dispatch]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetModal = () => {
    setForm(emptyForm); setFiles(emptyFiles); setPreviews({ photo: '', signature: '' });
    setDocMeta(emptyDocMeta); setMobileOtp(emptyOtp); setEmgOtp(emptyOtp); setError('');
  };

  const onFileChange = (key, file) => {
    setFiles(f => ({ ...f, [key]: file }));
    if ((key === 'photo' || key === 'signature') && file) {
      setPreviews(p => ({ ...p, [key]: URL.createObjectURL(file) }));
    }
  };

  const onCameraCapture = (file, dataUrl) => {
    setFiles(f => ({ ...f, [cameraTarget]: file }));
    setPreviews(p => ({ ...p, [cameraTarget]: dataUrl }));
    setCameraTarget(null);
  };

  const handleSendOtp = async (which) => {
    const phone = which === 'mobile' ? form.phone : form.emergencyContactPhone;
    const setter = which === 'mobile' ? setMobileOtp : setEmgOtp;
    if (!phone) { setter(s => ({ ...s, error: 'Enter a phone number first.' })); return; }
    setter(s => ({ ...s, error: '' }));
    try {
      await dispatch(sendDriverOtp({ phone, purpose: which === 'mobile' ? 'mobile' : 'emergencyContact' })).unwrap();
      setter(s => ({ ...s, sent: true }));
    } catch (err) { setter(s => ({ ...s, error: err || 'Failed to send OTP.' })); }
  };

  const handleVerifyOtp = async (which) => {
    const phone = which === 'mobile' ? form.phone : form.emergencyContactPhone;
    const state = which === 'mobile' ? mobileOtp : emgOtp;
    const setter = which === 'mobile' ? setMobileOtp : setEmgOtp;
    setter(s => ({ ...s, verifying: true, error: '' }));
    try {
      await dispatch(verifyDriverOtp({ phone, otp: state.code, purpose: which === 'mobile' ? 'mobile' : 'emergencyContact' })).unwrap();
      setter(s => ({ ...s, verifying: false }));
      set(which === 'mobile' ? 'mobileVerified' : 'emergencyContactVerified', true);
    } catch (err) { setter(s => ({ ...s, verifying: false, error: err || 'Invalid or expired OTP.' })); }
  };

  const approvedVehicles = vehicles.filter(v => v.status === 'Approved');

  const handleAdd = async () => {
    const required = ['name', 'address', 'aadhaar', 'phone', 'emergencyContactName', 'emergencyContactPhone', 'licenseNo', 'salary'];
    if (required.some(k => !String(form[k]).trim())) {
      setError('All required fields must be filled.'); return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('mobileVerified', String(!!form.mobileVerified));
      fd.append('emergencyContactVerified', String(!!form.emergencyContactVerified));
      Object.entries(files).forEach(([k, v]) => { if (v) fd.append(k, v); });
      Object.entries(docMeta).forEach(([k, v]) => { if (v) fd.append(k, v); });

      await dispatch(createDriver(fd)).unwrap();
      setShowModal(false);
      resetModal();
      dispatch(fetchDrivers());
      dispatch(fetchComplianceAlerts());
    } catch (err) {
      setError(err || 'Failed to add driver.');
    } finally { setSaving(false); }
  };

  const openDetail = (d) => {
    setDetailDriver(d);
    dispatch(fetchDriverOverview(d._id));
  };

  const handleOperationalStatus = async (id, driverStatus) => {
    await dispatch(updateDriverOperationalStatus({ id, driverStatus })).unwrap().catch(() => {});
    dispatch(fetchDrivers());
  };

  const handleDownloadPdf = async (driver) => {
    setPdfBusy(true);
    try { await generateDriverProfilePDF(driver, overview); }
    finally { setPdfBusy(false); }
  };

  const openAssign = (d) => { setAssignPicker(d); setAssignForm({ vehicleId: '' }); };

  const handleAssign = async () => {
    if (!assignForm.vehicleId) return;
    await dispatch(assignDriver({
      id: assignForm.vehicleId,
      driverId: assignPicker._id, driverName: assignPicker.name,
    })).unwrap().catch(() => {});
    dispatch(fetchVehicles());
    if (detailDriver) dispatch(fetchDriverOverview(detailDriver._id));
    setAssignPicker(null);
  };

  const handleRenewDoc = async () => {
    if (!renewDoc?.file) return;
    const fd = new FormData();
    fd.append('docType', renewDoc.docType);
    fd.append('file', renewDoc.file);
    if (renewDoc.number) fd.append('number', renewDoc.number);
    if (renewDoc.expiryDate) fd.append('expiryDate', renewDoc.expiryDate);
    if (renewDoc.docType === 'others' && renewDoc.otherName) fd.append('otherName', renewDoc.otherName);
    const updated = await dispatch(uploadDriverDocument({ id: detailDriver._id, formData: fd })).unwrap().catch(() => null);
    if (updated) { setDetailDriver(updated); dispatch(fetchDrivers()); dispatch(fetchComplianceAlerts()); }
    setRenewDoc(null);
  };

  const alertCount = complianceAlerts.length;

  const stats = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter(d => d.driverStatus === 'Active').length,
    pending: drivers.filter(d => d.status === 'Pending').length,
  }), [drivers]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Total Drivers', stats.total, 'text-gray-800'],
          ['Active', stats.active, 'text-emerald-600'],
          ['Pending Approval', stats.pending, 'text-amber-600'],
          ['Compliance Alerts', alertCount, 'text-red-600'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Compliance alerts banner */}
      {alertCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Document Expiry Alerts
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {complianceAlerts.map((a, i) => (
              <p key={i} className="text-xs text-amber-700">
                <span className="font-medium">{a.name}</span> ({a.driverCode}) — {a.docType} is{' '}
                <span className="font-semibold">{a.status.toLowerCase()}</span>
                {a.expiryDate && ` (${new Date(a.expiryDate).toLocaleDateString('en-IN')})`}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { setShowModal(true); resetModal(); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-teal-50 rounded-xl p-2.5"><UserCheck className="w-5 h-5 text-teal-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Driver Management</h2>
            <p className="text-xs text-gray-400">Register, verify, assign and track drivers — Super Admin reviews approvals</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{drivers.length} driver{drivers.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Code', 'Driver Name', 'License No.', 'Mobile', 'Verified', 'Driver Status', 'Approval', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && drivers.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">No drivers added yet.</td></tr>
              )}
              {drivers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-teal-700">{d.driverCode}</td>
                  <td className="px-5 py-4 font-medium text-gray-800">
                    <button onClick={() => openDetail(d)} className="hover:underline text-blue-700">{d.name}</button>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{d.licenseNo}</td>
                  <td className="px-5 py-4 text-gray-500">{d.phone}</td>
                  <td className="px-5 py-4">
                    {d.mobileVerified
                      ? <Badge color="bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Verified</Badge>
                      : <Badge color="bg-gray-100 text-gray-500"><XCircle className="w-3 h-3" /> Unverified</Badge>}
                  </td>
                  <td className="px-5 py-4"><Badge color={driverStatusColor[d.driverStatus]}>{d.driverStatus || 'Active'}</Badge></td>
                  <td className="px-5 py-4"><Badge color={statusColor[d.status]}>{d.status}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openAssign(d)} title="Assign / Reassign Vehicle" className="text-blue-500 hover:text-blue-700">
                        <Truck className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDetail(d)} title="View Details" className="text-gray-400 hover:text-gray-600">
                        <FileText className="w-4 h-4" />
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
          totalItems={drivers.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* Add Driver modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">Register Driver</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SectionTitle>Personal Information</SectionTitle>

              <Field label="Full Name *">
                <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Full name" />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address *">
                  <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Full residential address" />
                </Field>
              </div>
              <Field label="Aadhaar Number *">
                <input value={form.aadhaar} onChange={e => set('aadhaar', e.target.value)} className={inputCls} placeholder="12-digit Aadhaar" />
              </Field>
              <Field label="PAN Number">
                <input value={form.pan} onChange={e => set('pan', e.target.value)} className={inputCls} placeholder="ABCDE1234F" />
              </Field>
              <Field label="Blood Group">
                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </Field>
              <Field label="Driver Status">
                <select value={form.driverStatus} onChange={e => set('driverStatus', e.target.value)} className={inputCls}>
                  {DRIVER_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              <SectionTitle>Mobile & Emergency Contact Verification</SectionTitle>

              <div>
                <Field label="Mobile Number *">
                  <div className="flex gap-2">
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="10-digit mobile number" disabled={form.mobileVerified} />
                    {!form.mobileVerified && (
                      <button type="button" onClick={() => handleSendOtp('mobile')} className="shrink-0 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100">
                        {mobileOtp.sent ? 'Resend' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </Field>
                {form.mobileVerified && <Badge color="bg-emerald-50 text-emerald-700 mt-2"><CheckCircle2 className="w-3 h-3" /> Mobile Verified</Badge>}
                {!form.mobileVerified && mobileOtp.sent && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input value={mobileOtp.code} onChange={e => setMobileOtp(s => ({ ...s, code: e.target.value }))}
                      className={`${inputCls} py-1.5`} placeholder="Enter OTP" maxLength={6} />
                    <button type="button" onClick={() => handleVerifyOtp('mobile')} disabled={mobileOtp.verifying}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 disabled:opacity-50">
                      Verify
                    </button>
                  </div>
                )}
                {!form.mobileVerified && mobileOtp.sent && !mobileOtp.error && (
                  <p className="mt-1 text-[11px] text-gray-400">OTP sent via SMS to {form.phone}.</p>
                )}
                {mobileOtp.error && <p className="mt-1 text-xs text-red-600">{mobileOtp.error}</p>}
              </div>

              <div>
                <Field label="Emergency / Alternate Contact *">
                  <input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} className={`${inputCls} mb-2`} placeholder="Contact name" />
                  <div className="flex gap-2">
                    <input value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} className={inputCls} placeholder="Contact mobile number" disabled={form.emergencyContactVerified} />
                    {!form.emergencyContactVerified && (
                      <button type="button" onClick={() => handleSendOtp('emergency')} className="shrink-0 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100">
                        {emgOtp.sent ? 'Resend' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </Field>
                {form.emergencyContactVerified && <Badge color="bg-emerald-50 text-emerald-700 mt-2"><CheckCircle2 className="w-3 h-3" /> Contact Verified</Badge>}
                {!form.emergencyContactVerified && emgOtp.sent && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input value={emgOtp.code} onChange={e => setEmgOtp(s => ({ ...s, code: e.target.value }))}
                      className={`${inputCls} py-1.5`} placeholder="Enter OTP" maxLength={6} />
                    <button type="button" onClick={() => handleVerifyOtp('emergency')} disabled={emgOtp.verifying}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 disabled:opacity-50">
                      Verify
                    </button>
                  </div>
                )}
                {!form.emergencyContactVerified && emgOtp.sent && !emgOtp.error && (
                  <p className="mt-1 text-[11px] text-gray-400">OTP sent via SMS to {form.emergencyContactPhone}.</p>
                )}
                {emgOtp.error && <p className="mt-1 text-xs text-red-600">{emgOtp.error}</p>}
              </div>

              <SectionTitle>Photo & Signature</SectionTitle>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                <div className="flex items-center gap-3">
                  {previews.photo
                    ? <img src={previews.photo} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                    : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300"><Camera className="w-6 h-6" /></div>}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg cursor-pointer text-center">
                      Upload File
                      <input type="file" accept="image/*" className="hidden" onChange={e => onFileChange('photo', e.target.files?.[0])} />
                    </label>
                    <button type="button" onClick={() => setCameraTarget('photo')} className="text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1 justify-center">
                      <Camera className="w-3.5 h-3.5" /> Webcam Capture
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                <div className="flex items-center gap-3">
                  {previews.signature
                    ? <img src={previews.signature} alt="Preview" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-white" />
                    : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300"><Upload className="w-6 h-6" /></div>}
                  <label className="text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg cursor-pointer text-center">
                    Upload Signature
                    <input type="file" accept="image/*" className="hidden" onChange={e => onFileChange('signature', e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              <SectionTitle>License & Documents</SectionTitle>

              <Field label="License Number *">
                <input value={form.licenseNo} onChange={e => set('licenseNo', e.target.value)} className={inputCls} placeholder="e.g. DL-01-20210012345" />
              </Field>
              <Field label="License Expiry Date">
                <input type="date" value={form.licenseExpiry} onChange={e => set('licenseExpiry', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Driving License Copy">
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('drivingLicenseDoc', e.target.files?.[0])} />
              </Field>
              <Field label="Aadhaar Card Copy">
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('aadhaarCardDoc', e.target.files?.[0])} />
              </Field>
              <Field label="PAN Card Copy">
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('panCardDoc', e.target.files?.[0])} />
              </Field>
              <Field label="Police Verification Certificate">
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('policeVerificationDoc', e.target.files?.[0])} />
              </Field>
              <Field label="Experience Certificate">
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('experienceCertificateDoc', e.target.files?.[0])} />
              </Field>

              <div>
                <Field label="Passport Number (Optional)">
                  <input value={docMeta.passportNumber} onChange={e => setDocMeta(m => ({ ...m, passportNumber: e.target.value }))} className={`${inputCls} mb-2`} placeholder="Passport number" />
                </Field>
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('passportDoc', e.target.files?.[0])} />
              </div>

              <div>
                <Field label="Medical Certificate Expiry">
                  <input type="date" value={docMeta.medicalCertificateExpiry} onChange={e => setDocMeta(m => ({ ...m, medicalCertificateExpiry: e.target.value }))} className={`${inputCls} mb-2`} />
                </Field>
                <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => onFileChange('medicalCertificateDoc', e.target.files?.[0])} />
              </div>

              <SectionTitle>Employment</SectionTitle>

              <Field label="Driver Salary (₹) *">
                <input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} className={inputCls} placeholder="Monthly salary" min={0} />
              </Field>
            </div>

            <p className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              This driver will be submitted for Super Admin approval. Mobile OTP verification is required before the driver can be activated.
            </p>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
                {saving ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraTarget && (
        <CameraCapture
          title={cameraTarget === 'photo' ? 'Capture Profile Photo' : 'Capture Signature'}
          onCapture={onCameraCapture}
          onClose={() => setCameraTarget(null)}
        />
      )}

      {/* Assign / Reassign Vehicle modal */}
      {assignPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Assign Vehicle — {assignPicker.name}</h3>
              <button onClick={() => setAssignPicker(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Vehicle">
                <CustomSelect
                  value={assignForm.vehicleId}
                  onChange={val => setAssignForm(f => ({ ...f, vehicleId: val }))}
                  options={approvedVehicles.map(v => ({ value: v._id, label: `${v.registrationNo} — ${v.type}` }))}
                  placeholder="— Select approved vehicle —"
                />
              </Field>
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Assignment requires Super Admin approval before it becomes active.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAssignPicker(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAssign} disabled={!assignForm.vehicleId} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm">Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Detail modal */}
      {detailDriver && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {detailDriver.photo
                  ? <img src={fileHref(detailDriver.photo)} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  : <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><UserCheck className="w-5 h-5" /></div>}
                <div>
                  <h3 className="font-bold text-gray-800">{detailDriver.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{detailDriver.driverCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadPdf(detailDriver)} disabled={pdfBusy}
                  className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 px-3 py-1.5 rounded-lg">
                  <FileDown className="w-3.5 h-3.5" /> {pdfBusy ? 'Generating…' : 'Download PDF'}
                </button>
                <button onClick={() => setDetailDriver(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge color={driverStatusColor[detailDriver.driverStatus]}>{detailDriver.driverStatus}</Badge>
              <Badge color={statusColor[detailDriver.status]}>{detailDriver.status}</Badge>
              {detailDriver.mobileVerified
                ? <Badge color="bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Mobile Verified</Badge>
                : <Badge color="bg-gray-100 text-gray-500">Mobile Unverified</Badge>}
              {detailDriver.emergencyContactVerified
                ? <Badge color="bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Contact Verified</Badge>
                : <Badge color="bg-gray-100 text-gray-500">Contact Unverified</Badge>}

              <select
                value={detailDriver.driverStatus}
                onChange={e => handleOperationalStatus(detailDriver._id, e.target.value)}
                className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1"
              >
                {DRIVER_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
              {[
                ['License No.', detailDriver.licenseNo],
                ['Mobile', detailDriver.phone],
                ['Aadhaar', detailDriver.aadhaar],
                ['PAN', detailDriver.pan || '—'],
                ['Blood Group', detailDriver.bloodGroup || '—'],
                ['Emergency Contact', detailDriver.emergencyContact],
                ['Salary', detailDriver.salary ? `₹${detailDriver.salary.toLocaleString('en-IN')}` : '—'],
                ['DOB', detailDriver.dob ? new Date(detailDriver.dob).toLocaleDateString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-xs text-gray-400 font-medium">Address</dt>
                <dd className="text-gray-800 font-medium mt-0.5">{detailDriver.address || '—'}</dd>
              </div>
            </dl>

            {/* Documents & Compliance */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Documents & Compliance</h4>
            <div className="space-y-2 mb-5">
              {DOC_TYPES.map(({ key, label, hasExpiry }) => {
                const doc = detailDriver.documents?.[key] || {};
                const status = key === 'drivingLicense' ? detailDriver.licenseExpiryStatus
                  : key === 'medicalCertificate' ? detailDriver.medicalExpiryStatus : null;
                return (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">
                        {doc.number && <>No: {doc.number} · </>}
                        {hasExpiry && doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString('en-IN')}` : (!doc.fileUrl ? 'Not uploaded' : 'On file')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status && <Badge color={complianceColor[status]}>{status}</Badge>}
                      {doc.fileUrl && (
                        <a href={fileHref(doc.fileUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:underline">View</a>
                      )}
                      <button onClick={() => setRenewDoc({ docType: key, number: doc.number || '', expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : '' })}
                        className="text-xs font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-100 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> {doc.fileUrl ? 'Renew' : 'Upload'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {detailDriver.documents?.others?.map((o, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <p className="text-sm font-medium text-gray-700">{o.name}</p>
                  <a href={fileHref(o.fileUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:underline">View</a>
                </div>
              ))}
              <button onClick={() => setRenewDoc({ docType: 'others', number: '', expiryDate: '', otherName: '' })}
                className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add other supporting document
              </button>
            </div>

            {/* Assignment & Trips */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Assignment & Trip History</h4>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {overview?.currentAssignments?.length ? overview.currentAssignments.map((a, i) => (
                  <Badge key={i} color={a.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                    <Truck className="w-3 h-3" /> {a.registrationNo} — {a.status}
                  </Badge>
                )) : <p className="text-xs text-gray-400">No vehicle currently assigned.</p>}
              </div>
              <button onClick={() => openAssign(detailDriver)} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1 shrink-0">
                <Truck className="w-3.5 h-3.5" /> Assign / Reassign
              </button>
            </div>
            {overview?.currentTrip && (
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Current trip: <span className="font-medium">{overview.currentTrip.dispatchNo}</span> ({overview.currentTrip.from} → {overview.currentTrip.to}) — {overview.currentTrip.status}</p>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {overview?.trips?.length ? overview.trips.map(t => (
                <div key={t._id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-mono font-semibold text-gray-600">{t.dispatchNo}</span>
                  <span className="text-gray-500">{t.from} → {t.to}</span>
                  <span className="text-gray-400">{new Date(t.scheduledDate).toLocaleDateString('en-IN')}</span>
                  <Badge color={t.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}>{t.status}</Badge>
                </div>
              )) : <p className="text-xs text-gray-400">No trip history yet.</p>}
            </div>

            <button onClick={() => setDetailDriver(null)}
              className="w-full mt-5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Renew/upload single document modal */}
      {renewDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[55] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{renewDoc.docType === 'others' ? 'Add Document' : 'Upload / Renew Document'}</h3>
              <button onClick={() => setRenewDoc(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="space-y-3">
              {renewDoc.docType === 'others' && (
                <Field label="Document Name">
                  <input value={renewDoc.otherName} onChange={e => setRenewDoc(d => ({ ...d, otherName: e.target.value }))} className={inputCls} placeholder="e.g. Vehicle Handling Certificate" />
                </Field>
              )}
              {DOC_TYPES.find(dt => dt.key === renewDoc.docType)?.hasNumber && (
                <Field label="Document Number">
                  <input value={renewDoc.number} onChange={e => setRenewDoc(d => ({ ...d, number: e.target.value }))} className={inputCls} />
                </Field>
              )}
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

export default AdminDriverManagement;
