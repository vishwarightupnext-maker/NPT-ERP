import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, Users, ArrowLeft, Search, Star, AlertTriangle, Gift, Plus } from 'lucide-react';
import { fetchDrivers } from '../../../../store/slices/driversSlice';
import {
  fetchDriverPerformance, addDriverIncident, addDriverPenalty, addDriverRating, adjustDriverRewardPoints,
} from '../../../../store/slices/driverHRSlice';

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const StatCard = ({ label, value, color = 'text-gray-800', bg = 'bg-gray-50' }) => (
  <div className={`${bg} rounded-xl p-4`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

export default function DriverPerformanceTab() {
  const dispatch = useDispatch();
  const { list: drivers } = useSelector(s => s.drivers);
  const { performance } = useSelector(s => s.driverHR);

  const [search, setSearch] = useState('');
  const [selDriver, setSelDriver] = useState('');
  const [incidentForm, setIncidentForm] = useState({ description: '', severity: 'Minor' });
  const [penaltyForm, setPenaltyForm] = useState({ amount: '', reason: '' });
  const [ratingForm, setRatingForm] = useState({ rating: '5', tripNo: '', comment: '' });
  const [rewardDelta, setRewardDelta] = useState('');

  useEffect(() => { dispatch(fetchDrivers()); }, [dispatch]);
  useEffect(() => { if (selDriver) dispatch(fetchDriverPerformance(selDriver)); }, [selDriver, dispatch]);

  const selectedDriver = drivers.find(d => d._id === selDriver);
  const filteredDrivers = drivers.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.driverCode?.toLowerCase().includes(search.toLowerCase()));

  const refresh = () => dispatch(fetchDriverPerformance(selDriver));

  const submitIncident = async () => {
    if (!incidentForm.description) return;
    await dispatch(addDriverIncident({ driverId: selDriver, ...incidentForm })).unwrap().catch(() => {});
    setIncidentForm({ description: '', severity: 'Minor' }); refresh();
  };
  const submitPenalty = async () => {
    if (!penaltyForm.amount) return;
    await dispatch(addDriverPenalty({ driverId: selDriver, ...penaltyForm })).unwrap().catch(() => {});
    setPenaltyForm({ amount: '', reason: '' }); refresh();
  };
  const submitRating = async () => {
    await dispatch(addDriverRating({ driverId: selDriver, ...ratingForm })).unwrap().catch(() => {});
    setRatingForm({ rating: '5', tripNo: '', comment: '' }); refresh();
  };
  const submitReward = async () => {
    if (!rewardDelta) return;
    await dispatch(adjustDriverRewardPoints({ driverId: selDriver, delta: Number(rewardDelta) })).unwrap().catch(() => {});
    setRewardDelta(''); refresh();
  };

  if (!selDriver) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver by name or code…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="bg-violet-50 rounded-xl p-2.5 shrink-0"><TrendingUp className="w-5 h-5 text-violet-700" /></div>
            <div>
              <h2 className="font-bold text-gray-800">Driver Performance</h2>
              <p className="text-xs text-gray-400 hidden sm:block">Select a driver to view trip stats, ratings, incidents and rewards</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 shrink-0">{filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4">
            {filteredDrivers.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No drivers found.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDrivers.map(d => (
                <div key={d._id} onClick={() => setSelDriver(d._id)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-violet-300 hover:bg-violet-50/40 cursor-pointer transition-all group">
                  <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700 font-bold text-base shrink-0">{d.name?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm group-hover:text-violet-700 transition-colors">{d.name}</p>
                    <p className="text-xs text-gray-400 truncate">{d.driverCode}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <button onClick={() => setSelDriver('')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-violet-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all drivers
        </button>
        {selectedDriver && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">{selectedDriver.name?.[0]?.toUpperCase()}</div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{selectedDriver.name}</p>
              <p className="text-xs text-gray-400">{selectedDriver.driverCode}</p>
            </div>
          </div>
        )}
      </div>

      {performance && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Trips Completed" value={performance.totalTrips} color="text-blue-700" bg="bg-blue-50" />
            <StatCard label="Distance Travelled" value={`${performance.totalDistance} km`} color="text-blue-700" bg="bg-blue-50" />
            <StatCard label="On-Time Delivery %" value={performance.onTimePercent != null ? `${performance.onTimePercent}%` : '—'} color="text-emerald-700" bg="bg-emerald-50" />
            <StatCard label="Avg. Customer Rating" value={performance.avgTripRating != null ? `${performance.avgTripRating} / 5` : '—'} color="text-amber-700" bg="bg-amber-50" />
            <StatCard label="Reward Points" value={performance.rewardPoints} color="text-violet-700" bg="bg-violet-50" />
            <StatCard label="Fuel Efficiency" value="Not tracked" bg="bg-gray-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Incidents */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Incident History</h3>
              <div className="space-y-2 mb-3">
                <input value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe incident…" className={inputCls} />
                <select value={incidentForm.severity} onChange={e => setIncidentForm(f => ({ ...f, severity: e.target.value }))} className={inputCls}>
                  {['Minor', 'Major', 'Critical'].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={submitIncident} className="w-full flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium py-2 rounded-lg"><Plus className="w-3 h-3" /> Log Incident</button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {performance.incidents?.length ? [...performance.incidents].reverse().map((inc, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium text-gray-700">{inc.description}</p>
                    <p className="text-gray-400">{inc.severity} · {new Date(inc.date).toLocaleDateString('en-IN')}</p>
                  </div>
                )) : <p className="text-xs text-gray-400">No incidents recorded.</p>}
              </div>
            </div>

            {/* Penalties */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Penalty Records</h3>
              <div className="space-y-2 mb-3">
                <input type="number" value={penaltyForm.amount} onChange={e => setPenaltyForm(f => ({ ...f, amount: e.target.value }))} placeholder="Penalty amount (₹)" className={inputCls} />
                <input value={penaltyForm.reason} onChange={e => setPenaltyForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason…" className={inputCls} />
                <button onClick={submitPenalty} className="w-full flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium py-2 rounded-lg"><Plus className="w-3 h-3" /> Add Penalty</button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {performance.penalties?.length ? [...performance.penalties].reverse().map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium text-gray-700">₹{p.amount.toLocaleString('en-IN')} — {p.reason}</p>
                    <p className="text-gray-400">{new Date(p.date).toLocaleDateString('en-IN')}</p>
                  </div>
                )) : <p className="text-xs text-gray-400">No penalties recorded.</p>}
              </div>
            </div>

            {/* Ratings + Rewards */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Customer Ratings</h3>
              <div className="space-y-2 mb-3">
                <select value={ratingForm.rating} onChange={e => setRatingForm(f => ({ ...f, rating: e.target.value }))} className={inputCls}>
                  {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
                </select>
                <input value={ratingForm.comment} onChange={e => setRatingForm(f => ({ ...f, comment: e.target.value }))} placeholder="Comment (optional)" className={inputCls} />
                <button onClick={submitRating} className="w-full flex items-center justify-center gap-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-medium py-2 rounded-lg"><Plus className="w-3 h-3" /> Add Rating</button>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto mb-3">
                {performance.ratings?.length ? [...performance.ratings].reverse().map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                    <span className="font-medium text-gray-700">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="text-gray-400">{new Date(r.date).toLocaleDateString('en-IN')}</span>
                  </div>
                )) : <p className="text-xs text-gray-400">No ratings recorded.</p>}
              </div>

              <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2 pt-2 border-t border-gray-100"><Gift className="w-4 h-4 text-violet-500" /> Reward Points</h3>
              <div className="flex gap-2">
                <input type="number" value={rewardDelta} onChange={e => setRewardDelta(e.target.value)} placeholder="+/- points" className={inputCls} />
                <button onClick={submitReward} className="shrink-0 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-medium px-3 rounded-lg">Apply</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
