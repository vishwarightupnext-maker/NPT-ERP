const Vehicle          = require('../models/Vehicle');
const Driver           = require('../models/Driver');
const Customer         = require('../models/Customer');
const User             = require('../models/User');
const Invoice          = require('../models/Invoice');
const LR                = require('../models/LR');
const Dispatch          = require('../models/Dispatch');
const TripExpense       = require('../models/TripExpense');
const OfficeExpense     = require('../models/OfficeExpense');
const VendorCommission = require('../models/VendorCommission');
const VendorTripEntry  = require('../models/VendorTripEntry');

exports.getMetrics = async (req, res) => {
  try {
    const now           = new Date();
    const startOfYear   = new Date(now.getFullYear(), 0, 1);
    const startOfToday  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const sumOf = (agg, field = 'total') => agg[0]?.[field] || 0;

    const [
      totalUsers, activeVehicles, approvedDrivers,
      pendingVehicles, pendingDrivers, pendingCustomers,
      totalInvoices, paidInvoices, sentInvoices, draftInvoices,
      totalLRs, totalDispatches,
      revenueAgg, monthlyDispatchData, monthlyLRData,

      totalVehicles, activeTrips, pendingTrips,
      todaysRevenueAgg, monthlyRevenueAgg,
      tripExpenseAgg, officeExpenseAgg,
      pendingPaymentsAgg, vendorBalanceAgg,
      tripDieselAgg, vendorDieselAgg,
      monthlyGstAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments({ status: 'Approved' }),
      Driver.countDocuments({ status: 'Approved' }),
      Vehicle.countDocuments({ status: 'Pending' }),
      Driver.countDocuments({ status: 'Pending' }),
      Customer.countDocuments({ status: 'Pending' }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'Paid' }),
      Invoice.countDocuments({ status: 'Sent' }),
      Invoice.countDocuments({ status: 'Draft' }),
      LR.countDocuments(),
      Dispatch.countDocuments(),
      Invoice.aggregate([
        { $match: { status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Dispatch.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
      ]),
      LR.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
      ]),

      // ── Dashboard cards ──────────────────────────────────────────────
      Vehicle.countDocuments(),
      Dispatch.countDocuments({ status: 'In Transit' }),
      Dispatch.countDocuments({ status: 'Pending' }),
      Invoice.aggregate([
        { $match: { status: 'Paid', invoiceDate: { $gte: startOfToday, $lte: endOfToday } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Invoice.aggregate([
        { $match: { status: 'Paid', invoiceDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      TripExpense.aggregate([
        { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      OfficeExpense.aggregate([
        { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ['Sent', 'Overdue'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      VendorCommission.aggregate([
        { $match: { status: 'Pending' } },
        { $group: { _id: null, total: { $sum: '$calculatedAmount' } } },
      ]),
      TripExpense.aggregate([
        { $match: { category: 'Diesel Expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      VendorTripEntry.aggregate([
        { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$diesel' } } },
      ]),
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, sgst: { $sum: '$sgstAmount' }, cgst: { $sum: '$cgstAmount' } } },
      ]),
    ]);

    const totalRevenue = sumOf(revenueAgg);

    const monthlyDispatches = Array(12).fill(0);
    monthlyDispatchData.forEach(({ _id, count }) => { monthlyDispatches[_id - 1] = count; });

    const monthlyLRs = Array(12).fill(0);
    monthlyLRData.forEach(({ _id, count }) => { monthlyLRs[_id - 1] = count; });

    const monthlyRevenue = sumOf(monthlyRevenueAgg);
    const expenses = sumOf(tripExpenseAgg) + sumOf(officeExpenseAgg);
    const dieselCost = sumOf(tripDieselAgg) + sumOf(vendorDieselAgg);
    const sgst = monthlyGstAgg[0]?.sgst || 0;
    const cgst = monthlyGstAgg[0]?.cgst || 0;

    res.json({
      totalUsers,
      activeVehicles,
      approvedDrivers,
      pendingApprovals: pendingVehicles + pendingDrivers + pendingCustomers,
      totalInvoices,
      paidInvoices,
      sentInvoices,
      draftInvoices,
      totalLRs,
      totalDispatches,
      totalRevenue,
      monthlyDispatches,
      monthlyLRs,

      // ── Dashboard cards ──────────────────────────────────────────────
      totalVehicles,
      activeTrips,
      pendingTrips,
      todaysRevenue: sumOf(todaysRevenueAgg),
      monthlyRevenue,
      expenses,
      profit: parseFloat((monthlyRevenue - expenses).toFixed(2)),
      pendingPayments: sumOf(pendingPaymentsAgg),
      vendorBalance: sumOf(vendorBalanceAgg),
      dieselCost,
      gstSummary: { sgst, cgst, total: parseFloat((sgst + cgst).toFixed(2)) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
