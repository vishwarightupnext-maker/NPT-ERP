import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard, CheckCircle2, FileText, Clock, TrendingUp, AlertCircle, Search, Calendar } from 'lucide-react';
import { fetchInvoices, updateInvoiceStatus } from '../../../store/slices/invoiceSlice';
import Pagination from '../../../components/Pagination';

const statusColor = {
  Draft:   'bg-gray-100 text-gray-600',
  Sent:    'bg-blue-50 text-blue-700',
  Paid:    'bg-green-50 text-green-700',
  Overdue: 'bg-red-50 text-red-700',
};

const nextStatus = { Draft: 'Sent', Sent: 'Paid' };

const BillingManagement = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.invoices);

  // Pagination, Search & Date Filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState('All');

  useEffect(() => { dispatch(fetchInvoices()); }, [dispatch]);

  const handleStatus = async (id, status) => {
    await dispatch(updateInvoiceStatus({ id, status })).unwrap().catch(() => {});
    dispatch(fetchInvoices());
  };

  const handlePresetClick = (preset) => {
    setQuickDateFilter(preset);
    setCurrentPage(1);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (preset === 'All') {
      setFromDateFilter('');
      setToDateFilter('');
    } else if (preset === 'Today') {
      setFromDateFilter(todayStr);
      setToDateFilter(todayStr);
    } else if (preset === 'This Month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setFromDateFilter(firstDay);
      setToDateFilter(todayStr);
    }
  };

  const clearDateFilters = () => {
    setFromDateFilter('');
    setToDateFilter('');
    setQuickDateFilter('All');
    setCurrentPage(1);
  };

  /* ── derived stats ── */
  const total        = list.length;
  const draftList    = list.filter(i => i.status === 'Draft');
  const sentList     = list.filter(i => i.status === 'Sent');
  const paidList     = list.filter(i => i.status === 'Paid');
  const overdueList  = list.filter(i => i.status === 'Overdue');

  const sum = arr => arr.reduce((s, i) => s + (i.grandTotal || i.total || 0), 0);
  const totalBilled  = sum(list.filter(i => i.status !== 'Draft'));
  const totalPaid    = sum(paidList);
  const pending      = sentList.length + overdueList.length;

  const fmt = n => `₹${n.toLocaleString('en-IN')}`;

  const statCards = [
    { label: 'Total Invoices',    value: total,                        sub: 'all time',          icon: FileText,    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100'   },
    { label: 'Total Billed',      value: fmt(totalBilled),             sub: 'sent + paid',       icon: TrendingUp,  bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100' },
    { label: 'Total Collected',   value: fmt(totalPaid),               sub: `${paidList.length} paid`,  icon: CheckCircle2, bg: 'bg-green-50',  text: 'text-green-700',   border: 'border-green-100'  },
    { label: 'Pending Payment',   value: pending,                      sub: 'sent or overdue',   icon: Clock,       bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100'  },
    { label: 'Draft',             value: draftList.length,             sub: 'not yet sent',      icon: FileText,    bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-100'   },
    { label: 'Overdue',           value: overdueList.length,           sub: 'past due date',     icon: AlertCircle, bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100'    },
  ];

  const filteredList = list.filter(inv => {
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    
    let matchesDate = true;
    const rawDate = inv.invoiceDate || inv.dueDate || inv.createdAt;
    if (rawDate) {
      const invDateStr = new Date(rawDate).toISOString().slice(0, 10);
      if (fromDateFilter && invDateStr < fromDateFilter) matchesDate = false;
      if (toDateFilter && invDateStr > toDateFilter) matchesDate = false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus && matchesDate;
    return matchesStatus && matchesDate && (
      (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
      (inv.billTo && inv.billTo.toLowerCase().includes(q)) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.status && inv.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, bg, text, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm p-4`}>
            <div className={`inline-flex rounded-xl p-2 mb-2 ${bg}`}>
              <Icon className={`w-4 h-4 ${text}`} />
            </div>
            <p className={`text-xl font-bold ${text}`}>{value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5 leading-tight">{label}</p>
            <p className="text-[11px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search Invoice No, Customer Name..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer transition"
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <span className="flex items-center gap-1.5 text-gray-600 font-semibold px-2.5 py-1 bg-gray-100 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-pink-600" /> Date Filter:
            </span>

            {/* Presets Chips */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
              {['All', 'Today', 'This Month'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    quickDateFilter === preset && !fromDateFilter && !toDateFilter
                      ? 'bg-white text-pink-700 shadow-2xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1 rounded-xl">
              <span className="text-gray-400 text-[11px] font-medium">From:</span>
              <input
                type="date"
                value={fromDateFilter}
                onChange={e => { setFromDateFilter(e.target.value); setQuickDateFilter('Custom'); setCurrentPage(1); }}
                className="bg-transparent text-xs text-gray-700 focus:outline-none"
              />
              <span className="text-gray-400 text-[11px] font-medium">To:</span>
              <input
                type="date"
                value={toDateFilter}
                onChange={e => { setToDateFilter(e.target.value); setQuickDateFilter('Custom'); setCurrentPage(1); }}
                className="bg-transparent text-xs text-gray-700 focus:outline-none"
              />
              {(fromDateFilter || toDateFilter) && (
                <button
                  onClick={clearDateFilters}
                  className="text-gray-400 hover:text-red-500 font-bold ml-1 text-xs"
                  title="Clear Date Filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {(fromDateFilter || toDateFilter || statusFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                clearDateFilters();
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-pink-50 rounded-xl p-2.5"><CreditCard className="w-5 h-5 text-pink-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Billing Management</h2>
            <p className="text-xs text-gray-400">Track invoice status and payments</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{filteredList.length} invoice{filteredList.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Invoice No.', 'Bill To', 'Grand Total', 'Invoice Date', 'Status', 'Action'].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && filteredList.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No invoices match filter criteria.</td></tr>
              )}
              {filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(inv => (
                <tr key={inv._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-amber-700">{inv.invoiceNo}</td>
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{inv.billTo || inv.customerName || '—'}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    ₹{(inv.grandTotal || inv.total || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    {inv.invoiceDate || inv.dueDate
                      ? new Date(inv.invoiceDate || inv.dueDate).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {nextStatus[inv.status] ? (
                      <button
                        onClick={() => handleStatus(inv._id, nextStatus[inv.status])}
                        className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as {nextStatus[inv.status]}
                      </button>
                    ) : (
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
          totalItems={filteredList.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>
    </div>
  );
};

export default BillingManagement;
