import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, Plus, X, Pencil, Trash2, FileText, Landmark,
  RefreshCw, TrendingUp, Wallet, ReceiptText,
} from 'lucide-react';
import {
  fetchVendors, createVendor, updateVendor, deleteVendor,
  uploadVendorDocument, fetchVendorLedger, fetchVendorPerformance,
} from '../../../../store/slices/vendorSlice';
import CustomSelect from '../../../../components/CustomSelect';
import { fileHref } from '../../../../utils/fileUrl';
import Pagination from '../../../../components/Pagination';

const COMMISSION_TYPES = ['Percentage', 'Fixed', 'Per Load', 'Monthly'];

const rateLabel = {
  Percentage: 'Commission Rate (%)',
  Fixed:      'Fixed Commission (₹)',
  'Per Load': 'Commission Per Load (₹)',
  Monthly:    'Monthly Commission (₹)',
};

const statusColor = {
  Active:   'bg-emerald-50 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-500',
};

const ledgerStatusColor = { Pending: 'bg-amber-50 text-amber-700', Paid: 'bg-emerald-50 text-emerald-700' };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const emptyForm = {
  name: '', phone: '', email: '', address: '', gstNumber: '',
  bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '', bankBranch: '',
  commissionType: 'Percentage', commissionRate: '', status: 'Active',
};

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const Badge = ({ color, children }) => (
  <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${color || 'bg-gray-100 text-gray-500'}`}>{children}</span>
);

const DOC_TYPES = [
  { key: 'gstCertificate', label: 'GST Certificate' },
  { key: 'panCard',        label: 'PAN Card' },
  { key: 'agreement',      label: 'Vendor Agreement' },
];

export default function VendorsTab() {
  const dispatch = useDispatch();
  const { list: vendors, loading, ledger, performance } = useSelector(s => s.vendor);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailVendor, setDetailVendor] = useState(null);
  const [renewDoc, setRenewDoc]         = useState(null); // { docType, file }
  const [ledgerFilter, setLedgerFilter] = useState('All'); // All | Pending | Paid

  useEffect(() => { dispatch(fetchVendors()); }, [dispatch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      name: v.name, phone: v.phone || '', email: v.email || '', address: v.address || '',
      gstNumber: v.gstNumber || '',
      bankAccountName: v.bankDetails?.accountName || '', bankAccountNumber: v.bankDetails?.accountNumber || '',
      bankIfsc: v.bankDetails?.ifsc || '', bankName: v.bankDetails?.bankName || '', bankBranch: v.bankDetails?.branchName || '',
      commissionType: v.commissionType, commissionRate: String(v.commissionRate ?? ''), status: v.status,
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Vendor name is required.'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name, phone: form.phone, email: form.email, address: form.address,
      gstNumber: form.gstNumber, commissionType: form.commissionType, commissionRate: form.commissionRate, status: form.status,
      bankDetails: {
        accountName: form.bankAccountName, accountNumber: form.bankAccountNumber,
        ifsc: form.bankIfsc, bankName: form.bankName, branchName: form.bankBranch,
      },
    };
    try {
      if (editing) await dispatch(updateVendor({ id: editing._id, ...payload })).unwrap();
      else await dispatch(createVendor(payload)).unwrap();
      setShowModal(false);
    } catch (err) { setError(err || 'Failed to save vendor.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor? Their commission history will also be removed.')) return;
    await dispatch(deleteVendor(id)).unwrap().catch(() => {});
  };

  const openDetail = (v) => {
    setDetailVendor(v);
    setLedgerFilter('All');
    dispatch(fetchVendorLedger(v._id));
    dispatch(fetchVendorPerformance(v._id));
  };

  const handleRenewDoc = async () => {
    if (!renewDoc?.file) return;
    const fd = new FormData();
    fd.append('docType', renewDoc.docType);
    fd.append('file', renewDoc.file);
    const updated = await dispatch(uploadVendorDocument({ id: detailVendor._id, formData: fd })).unwrap().catch(() => null);
    if (updated) setDetailVendor(updated);
    setRenewDoc(null);
  };

  const filteredLedger = useMemo(() => {
    if (!ledger?.ledger) return [];
    if (ledgerFilter === 'All') return ledger.ledger;
    return ledger.ledger.filter(e => e.status === ledgerFilter);
  }, [ledger, ledgerFilter]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-blue-50 rounded-xl p-2.5"><Users className="w-5 h-5 text-blue-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Vendors</h2>
            <p className="text-xs text-gray-400">Registration, documents, GST/bank details, ledger & performance</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Code', 'Name', 'Phone', 'GSTIN', 'Commission Type', 'Rate', 'Status', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && vendors.length === 0 && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">No vendors added yet.</td></tr>}
              {vendors.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(v => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">{v.vendorCode}</td>
                  <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">
                    <button onClick={() => openDetail(v)} className="hover:underline text-blue-700">{v.name}</button>
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.phone || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.gstNumber || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.commissionType}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    {v.commissionType === 'Percentage' ? `${v.commissionRate}%` : `₹${Number(v.commissionRate).toLocaleString('en-IN')}`}
                  </td>
                  <td className="px-5 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[v.status]}`}>{v.status}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(v)} className="text-blue-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(v._id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={vendors.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* Add / Edit Vendor modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{editing ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vendor Name *">
                <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Vendor / company name" />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Status">
                <CustomSelect value={form.status} onChange={val => set('status', val)}
                  options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                </Field>
              </div>

              <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">GST Details</p>
              </div>
              <Field label="GSTIN">
                <input value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} className={inputCls} placeholder="e.g. 22AAAAA0000A1Z5" />
              </Field>

              <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Bank Details</p>
              </div>
              <Field label="Account Holder Name">
                <input value={form.bankAccountName} onChange={e => set('bankAccountName', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Account Number">
                <input value={form.bankAccountNumber} onChange={e => set('bankAccountNumber', e.target.value)} className={inputCls} />
              </Field>
              <Field label="IFSC Code">
                <input value={form.bankIfsc} onChange={e => set('bankIfsc', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Bank Name">
                <input value={form.bankName} onChange={e => set('bankName', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Branch">
                <input value={form.bankBranch} onChange={e => set('bankBranch', e.target.value)} className={inputCls} />
              </Field>

              <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Commission</p>
              </div>
              <Field label="Commission Type">
                <CustomSelect value={form.commissionType} onChange={val => set('commissionType', val)}
                  options={COMMISSION_TYPES.map(t => ({ value: t, label: t }))} />
              </Field>
              <Field label={rateLabel[form.commissionType]}>
                <input type="number" min={0} value={form.commissionRate} onChange={e => set('commissionRate', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl text-sm">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Detail modal */}
      {detailVendor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">{detailVendor.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{detailVendor.vendorCode}</p>
              </div>
              <button onClick={() => setDetailVendor(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <Badge color={statusColor[detailVendor.status]}>{detailVendor.status}</Badge>
              <Badge color="bg-indigo-50 text-indigo-700">{detailVendor.commissionType}</Badge>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
              {[
                ['Phone', detailVendor.phone], ['Email', detailVendor.email],
                ['GSTIN', detailVendor.gstNumber], ['Address', detailVendor.address],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            {/* Bank Details */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Bank Details</h4>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5 bg-gray-50 rounded-xl p-4">
              {[
                ['Account Name', detailVendor.bankDetails?.accountName],
                ['Account Number', detailVendor.bankDetails?.accountNumber],
                ['IFSC', detailVendor.bankDetails?.ifsc],
                ['Bank / Branch', [detailVendor.bankDetails?.bankName, detailVendor.bankDetails?.branchName].filter(Boolean).join(' / ')],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            {/* Documents */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Vendor Documents</h4>
            <div className="space-y-2 mb-5">
              {DOC_TYPES.map(({ key, label }) => {
                const fileUrl = detailVendor.documents?.[key];
                return (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {fileUrl && <a href={fileHref(fileUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:underline">View</a>}
                      <button onClick={() => setRenewDoc({ docType: key, file: null })}
                        className="text-xs font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-100 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> {fileUrl ? 'Renew' : 'Upload'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance & Outstanding */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Performance & Outstanding</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-red-50 rounded-2xl p-3"><p className="text-[11px] text-red-600">Outstanding</p><p className="text-lg font-bold text-red-700">₹{(ledger?.outstanding ?? 0).toLocaleString('en-IN')}</p></div>
              <div className="bg-emerald-50 rounded-2xl p-3"><p className="text-[11px] text-emerald-600">Total Paid</p><p className="text-lg font-bold text-emerald-700">₹{(ledger?.totalPaid ?? 0).toLocaleString('en-IN')}</p></div>
              <div className="bg-blue-50 rounded-2xl p-3"><p className="text-[11px] text-blue-600">On-time Payment %</p><p className="text-lg font-bold text-blue-700">{performance?.onTimePaymentRate != null ? `${performance.onTimePaymentRate}%` : '—'}</p></div>
              <div className="bg-violet-50 rounded-2xl p-3"><p className="text-[11px] text-violet-600">Avg Settlement</p><p className="text-lg font-bold text-violet-700">{performance?.avgSettlementDays != null ? `${performance.avgSettlementDays}d` : '—'}</p></div>
            </div>

            {/* Vendor Ledger & Payment History */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ReceiptText className="w-3.5 h-3.5" /> Vendor Ledger & Payment History</h4>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-2 w-fit">
              {['All', 'Pending', 'Paid'].map(f => (
                <button key={f} onClick={() => setLedgerFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${ledgerFilter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-xl mb-5">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                  <tr>{['Date', 'Type', 'Period', 'Amount', 'Status', 'Balance'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLedger.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No ledger entries yet.</td></tr>}
                  {filteredLedger.map((e, i) => (
                    <tr key={e._id || i}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(e.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{e.commissionType}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{e.month && e.year ? `${MONTHS[e.month - 1]} ${e.year}` : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-800">₹{e.calculatedAmount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full font-medium ${ledgerStatusColor[e.status]}`}>{e.status}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">₹{e.runningBalance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => setDetailVendor(null)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upload/renew a vendor document */}
      {renewDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[55] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Upload / Renew Document</h3>
              <button onClick={() => setRenewDoc(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <Field label="File">
              <input type="file" accept="image/*,.pdf" className="text-xs" onChange={e => setRenewDoc(d => ({ ...d, file: e.target.files?.[0] }))} />
            </Field>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRenewDoc(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRenewDoc} disabled={!renewDoc.file} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
