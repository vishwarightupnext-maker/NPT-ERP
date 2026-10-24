const VendorTripEntry = require('../models/VendorTripEntry');
const Vendor           = require('../models/Vendor');

exports.getEntries = async (req, res) => {
  try {
    const { vendorId, from, to } = req.query;
    const q = {};
    if (vendorId) q.vendor = vendorId;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    res.json(await VendorTripEntry.find(q).sort({ date: -1, createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const normalizeEntries = (entries) => (Array.isArray(entries) ? entries : [])
  .filter((e) => e && (e.amount || e.date || e.remarks))
  .map((e) => ({
    date: e.date || Date.now(),
    amount: Number(e.amount) || 0,
    remarks: e.remarks ? String(e.remarks).trim() : '',
  }));

exports.createEntry = async (req, res) => {
  try {
    const { vendorId, date, vehicleNo, driverName, connectivity, diesel, cashEntries, settlementEntries, settlement, settlementDate, remarks, pod } = req.body;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (!vehicleNo) return res.status(400).json({ message: 'Vehicle No is required' });

    const normCash = normalizeEntries(cashEntries);
    const normSettlement = normalizeEntries(settlementEntries);
    const calculatedSettlement = normSettlement.length > 0
      ? normSettlement.reduce((a, e) => a + e.amount, 0)
      : (Number(settlement) || 0);

    const entry = await VendorTripEntry.create({
      vendor: vendorId, vendorName: vendor.name,
      date: date || Date.now(), vehicleNo,
      driverName: driverName || '',
      connectivity: Number(connectivity) || 0,
      diesel: Number(diesel) || 0,
      cashEntries: normCash,
      settlementEntries: normSettlement,
      settlement: calculatedSettlement,
      settlementDate: settlementDate ? new Date(settlementDate) : (calculatedSettlement > 0 ? new Date() : undefined),
      remarks: remarks || '',
      pod: pod || '',
    });
    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateEntry = async (req, res) => {
  try {
    const update = {};
    ['date', 'vehicleNo', 'driverName', 'remarks', 'pod', 'settlementDate'].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k] ? new Date(req.body[k]) : null;
    });
    ['date', 'vehicleNo', 'driverName', 'remarks', 'pod'].forEach((k) => {
      if (req.body[k] !== undefined && k !== 'settlementDate') update[k] = req.body[k];
    });
    ['connectivity', 'diesel'].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = Number(req.body[k]) || 0;
    });
    if (req.body.cashEntries !== undefined) update.cashEntries = normalizeEntries(req.body.cashEntries);
    if (req.body.settlementEntries !== undefined) {
      update.settlementEntries = normalizeEntries(req.body.settlementEntries);
      if (update.settlementEntries.length > 0) {
        update.settlement = update.settlementEntries.reduce((a, e) => a + e.amount, 0);
      } else if (req.body.settlement !== undefined) {
        update.settlement = Number(req.body.settlement) || 0;
      }
    } else if (req.body.settlement !== undefined) {
      update.settlement = Number(req.body.settlement) || 0;
    }
    const entry = await VendorTripEntry.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteEntry = async (req, res) => {
  try {
    await VendorTripEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Totals row — mirrors the "TOTAL" row at the bottom of the vendor's own sheet.
exports.getVendorTripSummary = async (req, res) => {
  try {
    const { vendorId } = req.query;
    if (!vendorId) return res.status(400).json({ message: 'vendorId is required' });
    const entries = await VendorTripEntry.find({ vendor: vendorId });

    const sum = (key) => parseFloat(entries.reduce((a, e) => a + (e[key] || 0), 0).toFixed(2));
    const connectivity = sum('connectivity');
    const diesel = sum('diesel');
    const cash = sum('cash');
    const settlement = sum('settlement');
    const advance = parseFloat((diesel + cash).toFixed(2));
    const remainDue = parseFloat((connectivity - advance).toFixed(2));
    const balance = parseFloat((connectivity - advance - settlement).toFixed(2));

    res.json({ count: entries.length, connectivity, diesel, cash, advance, settlement, remainDue, balance });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
