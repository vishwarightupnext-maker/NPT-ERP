import { useState } from 'react';
import { Truck, ClipboardList } from 'lucide-react';
import FleetCapacityTab from './FleetCapacityTab';
import AdminVehicleManagement from '../AdminVehicleManagement';

const TABS = [
  { key: 'fleet',      label: '32 Feet Truck Support', icon: Truck },
  { key: 'management', label: 'Vehicle Management Module', icon: ClipboardList },
];

const VehicleManagementHub = () => {
  const [tab, setTab] = useState('fleet');

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

      {tab === 'fleet' && <FleetCapacityTab />}
      {tab === 'management' && <AdminVehicleManagement />}
    </div>
  );
};

export default VehicleManagementHub;
