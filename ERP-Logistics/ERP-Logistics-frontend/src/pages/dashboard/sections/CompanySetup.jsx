import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import api from '../../../api/axios';

const FIELDS = [
  { key: 'name', label: 'Company Name' },
  { key: 'code', label: 'Company Code' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'panNumber', label: 'PAN Number' },
  { key: 'address', label: 'Registered Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode' },
];

const empty = { name: '', code: '', gstNumber: '', panNumber: '', address: '', city: '', state: '', pincode: '' };

const CompanySetup = () => {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/company')
      .then(r => { if (r.data && r.data._id) setForm(prev => ({ ...prev, ...r.data })); })
      .catch(() => {});
  }, []);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/company', form);
      setMessage({ type: 'success', text: 'Company details saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3"><Building2 className="w-5 h-5 text-blue-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Company Setup</h2>
            <p className="text-sm text-gray-400">Configure your company details and structure</p>
          </div>
        </div>

        {message && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${label}`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySetup;
