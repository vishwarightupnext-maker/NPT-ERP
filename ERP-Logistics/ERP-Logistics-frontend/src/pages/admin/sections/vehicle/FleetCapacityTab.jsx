import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Truck, Search, ArrowLeft, Clock } from 'lucide-react';
import { fetchFleetAvailability, fetchVehicleOverview } from '../../../../store/slices/vehiclesSlice';

const availabilityColor = {
  Available:           'bg-emerald-50 text-emerald-700',
  'On Trip':           'bg-blue-50 text-blue-700',
  'Under Maintenance': 'bg-orange-50 text-orange-700',
  Inactive:            'bg-gray-100 text-gray-500',
};

const statusColor = {
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Pending:  'bg-amber-50 text-amber-700',
};

const Badge = ({ color, children }) => (
  <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${color || 'bg-gray-100 text-gray-500'}`}>{children}</span>
);

export default function FleetCapacityTab() {
  const dispatch = useDispatch();
  const { fleetAvailability, overview } = useSelector(s => s.vehicles);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selVehicle, setSelVehicle] = useState(null);

  useEffect(() => { dispatch(fetchFleetAvailability()); }, [dispatch]);

  const types = useMemo(() => {
    const m = {};
    fleetAvailability.forEach(v => { m[v.type] = (m[v.type] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [fleetAvailability]);

  const filtered = fleetAvailability.filter(v =>
    (!typeFilter || v.type === typeFilter) &&
    (!search || v.registrationNo.toLowerCase().includes(search.toLowerCase()))
  );

  const openVehicle = (v) => { setSelVehicle(v); dispatch(fetchVehicleOverview(v.vehicleId)); };

  const stats = {
    total: fleetAvailability.length,
    available: fleetAvailability.filter(v => v.availabilityStatus === 'Available').length,
    onTrip: fleetAvailability.filter(v => v.availabilityStatus === 'On Trip').length,
    maintenance: fleetAvailability.filter(v => v.availabilityStatus === 'Under Maintenance').length,
    thirtyTwoFt: fleetAvailability.filter(v => v.type === '32 Feet Truck').length,
  };

  if (selVehicle) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <button onClick={() => setSelVehicle(null)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-sky-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to fleet
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-xs shrink-0"><Truck className="w-4 h-4" /></div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{selVehicle.registrationNo}</p>
              <p className="text-xs text-gray-400">{selVehicle.type} · {selVehicle.capacity}{selVehicle.capacityTons ? ` (${selVehicle.capacityTons}T)` : ''}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl p-4 ${availabilityColor[selVehicle.availabilityStatus]}`}>
            <p className="text-xs opacity-70">Availability</p>
            <p className="text-lg font-bold">{selVehicle.availabilityStatus}</p>
          </div>
          <div className={`rounded-2xl p-4 ${statusColor[selVehicle.approvalStatus]}`}>
            <p className="text-xs opacity-70">Approval</p>
            <p className="text-lg font-bold">{selVehicle.approvalStatus}</p>
          </div>
          {selVehicle.activeTrip && (
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs text-blue-600">Active Trip</p>
              <p className="text-sm font-bold text-blue-800">{selVehicle.activeTrip.dispatchNo} — {selVehicle.activeTrip.from} → {selVehicle.activeTrip.to}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-800 text-sm">Trip History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>{['Dispatch No.', 'Driver', 'From → To', 'Date', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(!overview?.trips || overview.trips.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No trip history yet.</td></tr>
                )}
                {overview?.trips?.map(t => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-violet-700">{t.dispatchNo}</td>
                    <td className="px-4 py-2.5 text-gray-500">{t.driver}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{t.from} → {t.to}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{new Date(t.scheduledDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5"><Badge color={t.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}>{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ['Total Vehicles', stats.total, 'text-gray-800'],
          ['32 Feet Trucks', stats.thirtyTwoFt, 'text-sky-700'],
          ['Available', stats.available, 'text-emerald-600'],
          ['On Trip', stats.onTrip, 'text-blue-600'],
          ['Under Maintenance', stats.maintenance, 'text-orange-600'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search registration no…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">All Types</option>
            {types.map(([t]) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-sky-50 rounded-xl p-2.5"><Truck className="w-5 h-5 text-sky-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Fleet Capacity & Allocation</h2>
            <p className="text-xs text-gray-400">Vehicle type, capacity and live availability — click a row for trip history</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Reg No.', 'Type', 'Capacity', 'Vehicle Status', 'Approval', 'Availability', 'Active Trip'].map(h => (
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No vehicles found.</td></tr>}
              {filtered.map(v => (
                <tr key={v.vehicleId} onClick={() => openVehicle(v)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-4 font-medium text-blue-700 whitespace-nowrap">{v.registrationNo}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.type}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.capacity}{v.capacityTons ? ` (${v.capacityTons}T)` : ''}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{v.vehicleStatus}</td>
                  <td className="px-5 py-4"><Badge color={statusColor[v.approvalStatus]}>{v.approvalStatus}</Badge></td>
                  <td className="px-5 py-4"><Badge color={availabilityColor[v.availabilityStatus]}>{v.availabilityStatus}</Badge></td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    {v.activeTrip ? `${v.activeTrip.dispatchNo} (${v.activeTrip.from} → ${v.activeTrip.to})` : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
