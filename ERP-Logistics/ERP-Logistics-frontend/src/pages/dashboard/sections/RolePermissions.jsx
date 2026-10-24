import { ShieldCheck } from 'lucide-react';

const roles = ['Super Admin', 'Admin', 'Manager', 'Driver', 'Viewer'];
const permissions = ['View Dashboard', 'Manage Users', 'Approve Vehicles', 'Approve Drivers', 'Manage Pricing', 'View Reports', 'Company Setup'];

const RolePermissions = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
      <div className="bg-violet-50 rounded-xl p-2.5"><ShieldCheck className="w-5 h-5 text-violet-700" /></div>
      <div>
        <h2 className="font-bold text-gray-800">Role Permissions Matrix</h2>
        <p className="text-xs text-gray-400">Toggle permissions per role</p>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-6 py-3 text-left font-semibold">Permission</th>
            {roles.map((r) => <th key={r} className="px-4 py-3 text-center font-semibold">{r}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {permissions.map((perm) => (
            <tr key={perm} className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">{perm}</td>
              {roles.map((r) => (
                <td key={r} className="px-4 py-3 text-center">
                  <input type="checkbox" defaultChecked={r === 'Super Admin'} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex justify-end px-6 py-4 border-t border-gray-100">
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition">Save Permissions</button>
    </div>
  </div>
);

export default RolePermissions;
