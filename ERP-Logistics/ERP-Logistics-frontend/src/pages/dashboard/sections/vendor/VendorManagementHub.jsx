import { useState } from 'react';
import { Users, Wallet, FileBarChart, Truck } from 'lucide-react';
import VendorsTab from './VendorsTab';
import CommissionSettlementTab from './CommissionSettlementTab';
import CommissionReportsTab from './CommissionReportsTab';
import VendorTripLedgerTab from './VendorTripLedgerTab';

const TABS = [
  { key: 'vendors',    label: 'Vendors',               icon: Users },
  { key: 'settlement', label: 'Commission Settlement', icon: Wallet },
  { key: 'reports',    label: 'Commission Reports',    icon: FileBarChart },
  { key: 'tripLedger', label: 'Vendor Trip Ledger',    icon: Truck },
];

const VendorManagementHub = () => {
  const [tab, setTab] = useState('vendors');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'vendors' && <VendorsTab />}
      {tab === 'settlement' && <CommissionSettlementTab />}
      {tab === 'reports' && <CommissionReportsTab />}
      {tab === 'tripLedger' && <VendorTripLedgerTab />}
    </div>
  );
};

export default VendorManagementHub;
