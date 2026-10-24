import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, AlertTriangle, ShieldCheck, Wallet, PackagePlus, CheckCircle2, XCircle } from 'lucide-react';
import { fetchComplianceAlerts, fetchOtpLogs } from '../../../../store/slices/driversSlice';
import { fetchDriverPayslips } from '../../../../store/slices/driverHRSlice';
import { fetchDispatches } from '../../../../store/slices/dispatchSlice';

const Badge = ({ color, children }) => (
  <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 shrink-0 ${color}`}>{children}</span>
);

const NotificationRow = ({ icon: Icon, iconColor, title, subtitle, time, badge }) => (
  <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl">
    <div className={`rounded-lg p-2 shrink-0 ${iconColor}`}><Icon className="w-4 h-4" /></div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
    {badge}
    {time && <span className="text-[11px] text-gray-300 shrink-0">{time}</span>}
  </div>
);

export default function DriverAlertsTab() {
  const dispatch = useDispatch();
  const { complianceAlerts, otpLogs } = useSelector(s => s.drivers);
  const { payslips } = useSelector(s => s.driverHR);
  const { list: dispatches } = useSelector(s => s.dispatches);

  useEffect(() => {
    dispatch(fetchComplianceAlerts());
    dispatch(fetchOtpLogs());
    dispatch(fetchDriverPayslips());
    dispatch(fetchDispatches());
  }, [dispatch]);

  const recentPaid = useMemo(() => [...payslips].filter(p => p.status === 'Paid' && p.paidAt)
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).slice(0, 10), [payslips]);

  const recentTrips = useMemo(() => [...dispatches]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10), [dispatches]);

  const recentOtp = useMemo(() => [...otpLogs].slice(0, 15), [otpLogs]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div className="bg-amber-50 rounded-xl p-2.5"><Bell className="w-5 h-5 text-amber-700" /></div>
        <div>
          <h2 className="font-bold text-gray-800">Notifications</h2>
          <p className="text-xs text-gray-400">License/document expiry, OTP verification, salary payment and trip assignment alerts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-gray-800 text-sm">License & Document Expiry Alerts</h3>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {complianceAlerts.length === 0 && <p className="text-center py-6 text-xs text-gray-400">No expiry alerts.</p>}
            {complianceAlerts.map((a, i) => (
              <NotificationRow key={i} icon={AlertTriangle} iconColor="bg-red-50 text-red-600"
                title={`${a.name} (${a.driverCode}) — ${a.docType}`}
                subtitle={a.expiryDate ? `Expires ${new Date(a.expiryDate).toLocaleDateString('en-IN')}` : ''}
                badge={<Badge color={a.status === 'Expired' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}>{a.status}</Badge>} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-800 text-sm">OTP Verification Alerts</h3>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {recentOtp.length === 0 && <p className="text-center py-6 text-xs text-gray-400">No OTP activity yet.</p>}
            {recentOtp.map((o, i) => (
              <NotificationRow key={i}
                icon={o.verified ? CheckCircle2 : XCircle}
                iconColor={o.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}
                title={`${o.purpose === 'mobile' ? 'Mobile' : o.purpose === 'emergencyContact' ? 'Emergency Contact' : 'Mobile Change'} — ${o.phone}`}
                subtitle={`${o.action === 'send' ? 'OTP sent' : 'OTP verify attempt'} · status: ${o.status || '—'}`}
                time={new Date(o.createdAt).toLocaleDateString('en-IN')} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Salary Payment Notifications</h3>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {recentPaid.length === 0 && <p className="text-center py-6 text-xs text-gray-400">No salary payments recorded yet.</p>}
            {recentPaid.map(p => (
              <NotificationRow key={p._id} icon={Wallet} iconColor="bg-emerald-50 text-emerald-600"
                title={`${p.driverName} (${p.driverCode}) paid ₹${p.netSalary.toLocaleString('en-IN')}`}
                subtitle={`${p.month}/${p.year}`}
                time={new Date(p.paidAt).toLocaleDateString('en-IN')} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Trip Assignment Notifications</h3>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {recentTrips.length === 0 && <p className="text-center py-6 text-xs text-gray-400">No trips assigned yet.</p>}
            {recentTrips.map(t => (
              <NotificationRow key={t._id} icon={PackagePlus} iconColor="bg-violet-50 text-violet-600"
                title={`${t.driver} assigned to ${t.dispatchNo}`}
                subtitle={`${t.from} → ${t.to}`}
                badge={<Badge color="bg-violet-50 text-violet-700">{t.status}</Badge>} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
