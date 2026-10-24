import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UserCheck, CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';
import { fetchDrivers, updateDriverStatus } from '../../../store/slices/driversSlice';
import { fileHref } from '../../../utils/fileUrl';
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

const DriverApproval = () => {
  const dispatch = useDispatch();
  const { list: drivers } = useSelector(s => s.drivers);
  const [detailDriver, setDetailDriver] = useState(null);
  const [approvalError, setApprovalError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchDrivers()); }, [dispatch]);

  const handleStatusUpdate = async (id, status) => {
    setApprovalError('');
    try {
      await dispatch(updateDriverStatus({ id, status })).unwrap();
      dispatch(fetchDrivers());
    } catch (err) {
      setApprovalError(err || 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-4">
      {approvalError && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {approvalError}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-teal-50 rounded-xl p-2.5"><UserCheck className="w-5 h-5 text-teal-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Driver Approval</h2>
            <p className="text-xs text-gray-400">Review and approve driver registrations submitted by Admin</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {drivers.filter(d => d.status === 'Pending').length} pending
          </span>
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
              {drivers.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No drivers submitted yet.</td></tr>
              )}
              {drivers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-teal-700">{d.driverCode}</td>
                  <td className="px-5 py-4 font-medium text-gray-800">
                    <button onClick={() => setDetailDriver(d)} className="hover:underline text-blue-700">{d.name}</button>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{d.licenseNo}</td>
                  <td className="px-5 py-4 text-gray-500">{d.phone}</td>
                  <td className="px-5 py-4">
                    {d.mobileVerified
                      ? <span className="text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                      : <span className="text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 bg-gray-100 text-gray-500"><XCircle className="w-3 h-3" /> Unverified</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${driverStatusColor[d.driverStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {d.driverStatus || 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    {d.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(d._id, 'Approved')}
                          title={!d.mobileVerified ? 'Note: mobile number is not yet OTP-verified' : ''}
                          className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleStatusUpdate(d._id, 'Rejected')} className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium transition">
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
          totalItems={drivers.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* Driver Detail Modal */}
      {detailDriver && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {detailDriver.photo
                  ? <img src={fileHref(detailDriver.photo)} alt="" className="w-11 h-11 rounded-full object-cover border border-gray-200" />
                  : <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><UserCheck className="w-5 h-5" /></div>}
                <div>
                  <h3 className="font-bold text-gray-800">Driver Details</h3>
                  <p className="text-xs text-gray-400 font-mono">{detailDriver.driverCode}</p>
                </div>
              </div>
              <button onClick={() => setDetailDriver(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            {!detailDriver.mobileVerified && (
              <p className="mb-4 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Mobile number not OTP-verified yet.
              </p>
            )}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Name', detailDriver.name],
                ['License No.', detailDriver.licenseNo],
                ['Mobile', detailDriver.phone],
                ['Aadhaar', detailDriver.aadhaar],
                ['PAN', detailDriver.pan || '—'],
                ['Blood Group', detailDriver.bloodGroup || '—'],
                ['Emergency Contact', detailDriver.emergencyContact],
                ['Salary', detailDriver.salary ? `₹${detailDriver.salary.toLocaleString('en-IN')}` : '—'],
                ['Driver Status', detailDriver.driverStatus],
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
            <button onClick={() => setDetailDriver(null)}
              className="w-full mt-5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverApproval;
