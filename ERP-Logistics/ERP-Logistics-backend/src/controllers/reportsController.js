const Dispatch          = require('../models/Dispatch');
const Vehicle           = require('../models/Vehicle');
const Driver            = require('../models/Driver');
const Vendor            = require('../models/Vendor');
const VendorCommission  = require('../models/VendorCommission');
const VendorTripEntry   = require('../models/VendorTripEntry');
const Customer          = require('../models/Customer');
const Invoice           = require('../models/Invoice');
const TripExpense       = require('../models/TripExpense');
const OfficeExpense     = require('../models/OfficeExpense');

const dateRange = (from, to) => {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(`${to}T23:59:59.999`);
  return range;
};
const round2 = (n) => parseFloat((n || 0).toFixed(2));

/* ── 1. Daily Trips ───────────────────────────────────────────────────── */
exports.dailyTrips = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const trips = await Dispatch.find({
      scheduledDate: { $gte: new Date(`${date}T00:00:00`), $lte: new Date(`${date}T23:59:59.999`) },
    }).sort({ scheduledDate: 1 });
    res.json(trips.map(t => ({
      DispatchNo: t.dispatchNo, Date: t.scheduledDate, Vehicle: t.vehicle, Driver: t.driver,
      From: t.from, To: t.to, Goods: t.goods, Distance: t.distance, Status: t.status,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 2. Monthly Trips ─────────────────────────────────────────────────── */
exports.monthlyTrips = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const trips = await Dispatch.find({
      scheduledDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59.999`) },
    });
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const rows = MONTHS.map((m, i) => {
      const monthTrips = trips.filter(t => new Date(t.scheduledDate).getMonth() === i);
      return {
        Month: m,
        'Total Trips': monthTrips.length,
        Delivered: monthTrips.filter(t => t.status === 'Delivered').length,
        Cancelled: monthTrips.filter(t => t.status === 'Cancelled').length,
      };
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 3. Vehicle Report ────────────────────────────────────────────────── */
exports.vehicleReport = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    const rows = await Promise.all(vehicles.map(async (v) => {
      const totalTrips = await Dispatch.countDocuments({ vehicle: v.registrationNo });
      return {
        'Reg No': v.registrationNo, Type: v.type, Capacity: v.capacity, Owner: v.owner,
        'Approval Status': v.status, 'Vehicle Status': v.vehicleStatus,
        Driver: v.driverAssignment?.driverName || '—', 'Total Trips': totalTrips,
      };
    }));
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 4. Driver Report ─────────────────────────────────────────────────── */
exports.driverReport = async (_req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    const rows = await Promise.all(drivers.map(async (d) => {
      const totalTrips = await Dispatch.countDocuments({ driver: d.name });
      const delivered = await Dispatch.countDocuments({ driver: d.name, status: 'Delivered' });
      return {
        Code: d.driverCode, Name: d.name, License: d.licenseNo, Phone: d.phone,
        'Approval Status': d.status, 'Driver Status': d.driverStatus,
        'Total Trips': totalTrips, Delivered: delivered,
      };
    }));
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 5. Vendor Report ─────────────────────────────────────────────────── */
exports.vendorReport = async (_req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    const rows = await Promise.all(vendors.map(async (v) => {
      const commissions = await VendorCommission.find({ vendor: v._id });
      const totalEarned = round2(commissions.reduce((a, c) => a + c.calculatedAmount, 0));
      const totalPaid = round2(commissions.filter(c => c.status === 'Paid').reduce((a, c) => a + c.calculatedAmount, 0));
      return {
        Code: v.vendorCode, Name: v.name, Phone: v.phone, GSTIN: v.gstNumber,
        'Commission Type': v.commissionType, Status: v.status,
        'Total Earned': totalEarned, 'Total Paid': totalPaid, Outstanding: round2(totalEarned - totalPaid),
      };
    }));
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 6. Customer Report ───────────────────────────────────────────────── */
exports.customerReport = async (_req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers.map(c => ({
      Name: c.name, Type: c.type, GSTIN: c.gstNumber || '—', Status: c.status,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 7. Invoice Report ────────────────────────────────────────────────── */
exports.invoiceReport = async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const q = {};
    const range = dateRange(from, to);
    if (range) q.invoiceDate = range;
    if (status) q.status = status;
    const invoices = await Invoice.find(q).sort({ invoiceDate: -1 });
    res.json(invoices.map(inv => ({
      'Invoice No': inv.invoiceNo, Date: inv.invoiceDate, 'Bill To': inv.billTo,
      Subtotal: inv.subtotal, GST: round2((inv.sgstAmount || 0) + (inv.cgstAmount || 0)),
      'Grand Total': inv.grandTotal, Status: inv.status,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 8. Expense Report ────────────────────────────────────────────────── */
exports.expenseReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = dateRange(from, to);
    const tripQ = range ? { date: range } : {};
    const officeQ = range ? { date: range } : {};
    const [tripExpenses, officeExpenses] = await Promise.all([
      TripExpense.find(tripQ).sort({ date: -1 }),
      OfficeExpense.find(officeQ).sort({ date: -1 }),
    ]);
    const rows = [
      ...tripExpenses.map(e => ({
        Date: e.date, Source: 'Trip', Category: e.category, Reference: e.registrationNo,
        Amount: e.amount, Notes: e.notes,
      })),
      ...officeExpenses.map(e => ({
        Date: e.date, Source: 'Office', Category: e.category, Reference: e.department || '—',
        Amount: e.amount, Notes: e.notes,
      })),
    ].sort((a, b) => new Date(b.Date) - new Date(a.Date));
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 9. Diesel Report ─────────────────────────────────────────────────── */
exports.dieselReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = dateRange(from, to);
    const tripQ = { category: 'Diesel Expense' };
    if (range) tripQ.date = range;
    const vendorQ = {};
    if (range) vendorQ.date = range;

    const [tripDiesel, vendorTrips] = await Promise.all([
      TripExpense.find(tripQ).sort({ date: -1 }),
      VendorTripEntry.find(vendorQ).sort({ date: -1 }),
    ]);
    const rows = [
      ...tripDiesel.map(e => ({
        Date: e.date, Source: 'Fleet', Vehicle: e.registrationNo, Liters: e.liters, Amount: e.amount,
      })),
      ...vendorTrips.filter(e => e.diesel > 0).map(e => ({
        Date: e.date, Source: `Vendor: ${e.vendorName}`, Vehicle: e.vehicleNo, Liters: '—', Amount: e.diesel,
      })),
    ].sort((a, b) => new Date(b.Date) - new Date(a.Date));
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 10. Profit & Loss ────────────────────────────────────────────────── */
exports.profitLossReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = dateRange(from, to);
    const invoiceQ = { status: 'Paid' };
    if (range) invoiceQ.invoiceDate = range;
    const tripQ = range ? { date: range } : {};
    const officeQ = range ? { date: range } : {};
    const commissionQ = { status: 'Paid' };
    if (range) commissionQ.paidAt = range;

    const [invoices, tripExpenses, officeExpenses, commissions] = await Promise.all([
      Invoice.find(invoiceQ), TripExpense.find(tripQ), OfficeExpense.find(officeQ), VendorCommission.find(commissionQ),
    ]);
    const revenue = round2(invoices.reduce((a, i) => a + i.grandTotal, 0));
    const tripExpenseTotal = round2(tripExpenses.reduce((a, e) => a + e.amount, 0));
    const officeExpenseTotal = round2(officeExpenses.reduce((a, e) => a + e.amount, 0));
    const commissionTotal = round2(commissions.reduce((a, c) => a + c.calculatedAmount, 0));
    const totalExpense = round2(tripExpenseTotal + officeExpenseTotal + commissionTotal);

    res.json([
      { 'Line Item': 'Revenue (Paid Invoices)', Amount: revenue },
      { 'Line Item': 'Trip Expenses', Amount: -tripExpenseTotal },
      { 'Line Item': 'Office Expenses', Amount: -officeExpenseTotal },
      { 'Line Item': 'Vendor Commission Paid', Amount: -commissionTotal },
      { 'Line Item': 'Net Profit / Loss', Amount: round2(revenue - totalExpense) },
    ]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 11. GST Report ───────────────────────────────────────────────────── */
exports.gstReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = {};
    const range = dateRange(from, to);
    if (range) q.invoiceDate = range;
    const invoices = await Invoice.find(q).sort({ invoiceDate: -1 });
    res.json(invoices.map(inv => ({
      'Invoice No': inv.invoiceNo, Date: inv.invoiceDate, 'Bill To': inv.billTo,
      Subtotal: inv.subtotal, 'SGST %': inv.sgstPct, 'SGST Amt': inv.sgstAmount,
      'CGST %': inv.cgstPct, 'CGST Amt': inv.cgstAmount, 'Grand Total': inv.grandTotal,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 12. Outstanding Report ───────────────────────────────────────────── */
exports.outstandingReport = async (_req, res) => {
  try {
    const invoices = await Invoice.find({ status: { $in: ['Sent', 'Overdue'] } }).sort({ invoiceDate: 1 });
    const now = Date.now();
    res.json(invoices.map(inv => ({
      'Invoice No': inv.invoiceNo, Date: inv.invoiceDate, 'Bill To': inv.billTo,
      'Grand Total': inv.grandTotal, Status: inv.status,
      'Days Outstanding': Math.max(0, Math.floor((now - new Date(inv.invoiceDate)) / 864e5)),
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── 13. Collection Report ────────────────────────────────────────────── */
exports.collectionReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = { status: 'Paid' };
    const range = dateRange(from, to);
    if (range) q.invoiceDate = range;
    const invoices = await Invoice.find(q).sort({ invoiceDate: -1 });
    res.json(invoices.map(inv => ({
      'Invoice No': inv.invoiceNo, Date: inv.invoiceDate, 'Bill To': inv.billTo, 'Amount Collected': inv.grandTotal,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};
