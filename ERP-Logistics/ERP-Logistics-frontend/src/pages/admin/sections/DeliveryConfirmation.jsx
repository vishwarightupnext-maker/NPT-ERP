import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PackageCheck, CheckCircle2 } from 'lucide-react';
import { fetchDispatches, updateDispatchStatus } from '../../../store/slices/dispatchSlice';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Pending:      'bg-amber-50 text-amber-700',
  Approved:     'bg-blue-50 text-blue-700',
  'In Transit': 'bg-violet-50 text-violet-700',
  Delivered:    'bg-green-50 text-green-700',
  Cancelled:    'bg-red-50 text-red-700',
};

const DeliveryConfirmation = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.dispatches);

  const active = list.filter(d => ['Approved', 'In Transit'].includes(d.status));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchDispatches()); }, [dispatch]);

  const confirmDelivery = async id => {
    if (!window.confirm('Mark this dispatch as Delivered?')) return;
    const distance = window.prompt('Distance travelled (km) — optional, used for Driver Performance:', '');
    const rating = window.prompt('Customer rating 1–5 — optional, used for Driver Performance:', '');
    await dispatch(updateDispatchStatus({
      id, status: 'Delivered',
      distance: distance ? Number(distance) : undefined,
      rating: rating ? Number(rating) : undefined,
    })).unwrap().catch(() => {});
    dispatch(fetchDispatches());
  };

  const markInTransit = async id => {
    await dispatch(updateDispatchStatus({ id, status: 'In Transit' })).unwrap().catch(() => {});
    dispatch(fetchDispatches());
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-emerald-50 rounded-xl p-2.5"><PackageCheck className="w-5 h-5 text-emerald-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Delivery Confirmation</h2>
            <p className="text-xs text-gray-400">Track dispatches in-transit and confirm deliveries</p>
          </div>
          <span className="ml-auto text-xs text-emerald-700 bg-emerald-50 font-semibold px-2.5 py-1 rounded-full">
            {active.length} active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Dispatch No.', 'Vehicle', 'Driver', 'Route', 'Goods', 'Scheduled', 'Status', 'Action'].map(h =>
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
                    {d.status === 'Approved' && (
                      <button onClick={() => markInTransit(d._id)}
                        className="flex items-center gap-1 bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                        Start Transit
                      </button>
                    )}
                    {d.status === 'In Transit' && (
                      <button onClick={() => confirmDelivery(d._id)}
                        className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Delivery
                      </button>
                    )}
                    {(d.status === 'Delivered' || d.status === 'Cancelled' || d.status === 'Pending') && (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
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

export default DeliveryConfirmation;
