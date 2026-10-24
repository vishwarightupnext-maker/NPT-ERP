import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { fetchLRs, updateLRStatus } from '../../../store/slices/lrSlice';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Created:      'bg-blue-50 text-blue-700',
  'In Transit': 'bg-amber-50 text-amber-700',
  Delivered:    'bg-green-50 text-green-700',
};

const PODVerification = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.lr);

  const delivered = list.filter(l => l.status === 'Delivered').length;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchLRs()); }, [dispatch]);

  const updateStatus = async (id, status) => {
    await dispatch(updateLRStatus({ id, status })).unwrap().catch(() => {});
    dispatch(fetchLRs());
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total LRs',     value: list.length,                                          color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: 'In Transit',    value: list.filter(l => l.status === 'In Transit').length,   color: 'text-amber-700',  bg: 'bg-amber-50'  },
          { label: 'POD Completed', value: delivered,                                             color: 'text-green-700',  bg: 'bg-green-50'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-orange-50 rounded-xl p-2.5"><ShieldCheck className="w-5 h-5 text-orange-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">POD Verification</h2>
            <p className="text-xs text-gray-400">Verify proof of delivery for Lorry Receipts</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['LR No.', 'Dispatch', 'Consignor', 'Consignee', 'Route', 'Goods', 'Amount', 'Status', 'Action'].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">No LRs found. Create one from LR Creation.</td></tr>}
              {list.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-700">{l.lrNo}</td>
                  <td className="px-5 py-4 text-gray-500 font-mono text-xs">{l.dispatchNo || '—'}</td>
                  <td className="px-5 py-4 text-gray-700">{l.consignorName}</td>
                  <td className="px-5 py-4 text-gray-700">{l.consigneeName}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{l.from} → {l.to}</td>
                  <td className="px-5 py-4 text-gray-500">{l.goods}</td>
                  <td className="px-5 py-4 font-medium text-gray-700">₹{l.amount?.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[l.status]}`}>{l.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    {l.status === 'Created' && (
                      <button onClick={() => updateStatus(l._id, 'In Transit')}
                        className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                        Mark In Transit
                      </button>
                    )}
                    {l.status === 'In Transit' && (
                      <button onClick={() => updateStatus(l._id, 'Delivered')}
                        className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verify POD
                      </button>
                    )}
                    {l.status === 'Delivered' && (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> POD Verified
                      </span>
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

export default PODVerification;
