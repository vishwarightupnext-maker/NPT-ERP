import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import { fetchDispatches, updateDispatchStatus } from '../../../store/slices/dispatchSlice';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Pending:    'bg-amber-50 text-amber-700',
  Approved:   'bg-blue-50 text-blue-700',
  'In Transit': 'bg-violet-50 text-violet-700',
  Delivered:  'bg-green-50 text-green-700',
  Cancelled:  'bg-red-50 text-red-700',
};

const DispatchApproval = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.dispatches);
  const pending = list.filter(d => d.status === 'Pending');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchDispatches()); }, [dispatch]);

  const handleStatus = async (id, status) => {
    await dispatch(updateDispatchStatus({ id, status })).unwrap().catch(() => {});
    dispatch(fetchDispatches());
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-green-50 rounded-xl p-2.5"><ClipboardCheck className="w-5 h-5 text-green-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Dispatch Approval</h2>
            <p className="text-xs text-gray-400">Approve or reject pending dispatch orders</p>
          </div>
          <span className="ml-auto text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full">
            {pending.length} pending
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Dispatch No.', 'Vehicle', 'Driver', 'Route', 'Goods', 'Date', 'Status', 'Actions'].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">No dispatches found.</td></tr>}
              {list.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-violet-700">{d.dispatchNo}</td>
                  <td className="px-5 py-4 text-gray-700">{d.vehicle}</td>
                  <td className="px-5 py-4 text-gray-500">{d.driver}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{d.from} → {d.to}</td>
                  <td className="px-5 py-4 text-gray-500">{d.goods}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(d.scheduledDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    {d.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatus(d._id, 'Approved')}
                          className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleStatus(d._id, 'Cancelled')}
                          className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium">
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
          totalItems={list.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>
    </div>
  );
};

export default DispatchApproval;
