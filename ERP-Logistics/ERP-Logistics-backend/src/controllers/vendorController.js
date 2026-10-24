const Vendor           = require('../models/Vendor');
const VendorCommission = require('../models/VendorCommission');

const fileUrl = (file) => (file ? `/uploads/vendors/${file.filename}` : '');

const DOC_MAP = {
  gstCertificate: 'gstCertificate',
  panCard:        'panCard',
  agreement:      'agreement',
};

/* ── Vendors ──────────────────────────────────────────────────────────────── */

exports.getVendors = async (_req, res) => {
  try {
    res.json(await Vendor.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const { name, phone, email, address, gstNumber, bankDetails, commissionType, commissionRate, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Vendor name is required' });
    const vendor = await Vendor.create({
      name, phone: phone || '', email: email || '', address: address || '',
      gstNumber: gstNumber || '',
      bankDetails: {
        accountName:   bankDetails?.accountName || '',
        accountNumber: bankDetails?.accountNumber || '',
        ifsc:          bankDetails?.ifsc || '',
        bankName:      bankDetails?.bankName || '',
        branchName:    bankDetails?.branchName || '',
      },
      commissionType: commissionType || 'Percentage',
      commissionRate: Number(commissionRate) || 0,
      status: status || 'Active',
    });
    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const b = req.body;
    const update = {};
    ['name', 'phone', 'email', 'address', 'gstNumber', 'commissionType', 'status'].forEach((k) => {
      if (b[k] !== undefined) update[k] = b[k];
    });
    if (b.commissionRate !== undefined) update.commissionRate = Number(b.commissionRate) || 0;
    if (b.bankDetails !== undefined) {
      Object.entries(b.bankDetails).forEach(([k, v]) => { update[`bankDetails.${k}`] = v; });
    }

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload/renew a vendor document (gstCertificate/panCard/agreement), or add
// an arbitrary "other" supporting document.
exports.uploadVendorDocument = async (req, res) => {
  try {
    const { docType, name } = req.body;
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    vendor.documents = vendor.documents || {};
    if (docType === 'other') {
      vendor.documents.others = vendor.documents.others || [];
      vendor.documents.others.push({ name: name || 'Document', fileUrl: fileUrl(req.file) });
    } else {
      const field = DOC_MAP[docType];
      if (!field) return res.status(400).json({ message: 'Invalid document type' });
      vendor.documents[field] = fileUrl(req.file);
    }
    await vendor.save();
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    await VendorCommission.deleteMany({ vendor: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Commission Entries & Settlement ─────────────────────────────────────── */

exports.getVendorCommissions = async (req, res) => {
  try {
    const { vendorId, status, month, year } = req.query;
    const q = {};
    if (vendorId) q.vendor = vendorId;
    if (status) q.status = status;
    if (month) q.month = Number(month);
    if (year) q.year = Number(year);
    res.json(await VendorCommission.find(q).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createVendorCommission = async (req, res) => {
  try {
    const { vendorId, commissionType, month, year, baseAmount, loadCount, rate, notes, settlementDate } = req.body;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const type = commissionType || vendor.commissionType;
    const usedRate = rate !== undefined ? Number(rate) || 0 : vendor.commissionRate;
    const base = Number(baseAmount) || 0;
    const loads = Number(loadCount) || 0;

    let calculatedAmount = 0;
    if (type === 'Percentage') calculatedAmount = base * (usedRate / 100);
    else if (type === 'Fixed') calculatedAmount = usedRate;
    else if (type === 'Per Load') calculatedAmount = loads * usedRate;
    else if (type === 'Monthly') calculatedAmount = usedRate;

    const entry = await VendorCommission.create({
      vendor: vendorId, vendorName: vendor.name, vendorCode: vendor.vendorCode,
      commissionType: type, month: month ? Number(month) : undefined, year: year ? Number(year) : undefined,
      baseAmount: base, loadCount: loads, rate: usedRate,
      calculatedAmount: parseFloat(calculatedAmount.toFixed(2)),
      notes: notes || '',
      settlementDate: settlementDate ? new Date(settlementDate) : undefined,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVendorCommissionStatus = async (req, res) => {
  try {
    const { status, settlementDate } = req.body;
    const sDate = settlementDate ? new Date(settlementDate) : new Date();
    const update = status === 'Paid'
      ? { $set: { status, paidAt: sDate, settlementDate: sDate } }
      : { $set: { status }, $unset: { paidAt: '', settlementDate: '' } };
    const entry = await VendorCommission.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!entry) return res.status(404).json({ message: 'Commission entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVendorCommission = async (req, res) => {
  try {
    await VendorCommission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Vendor Ledger, Outstanding & Performance ────────────────────────────── */

// Chronological ledger of every commission entry for one vendor, with a
// running balance (cumulative earned − cumulative paid) after each entry —
// covers both "Vendor Ledger" and "Payment History" in one view.
exports.getVendorLedger = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const entries = await VendorCommission.find({ vendor: req.params.id }).sort({ createdAt: 1 });

    let runningBalance = 0;
    const ledger = entries.map((e) => {
      runningBalance += e.status === 'Paid' ? 0 : e.calculatedAmount;
      return { ...e.toObject(), runningBalance: parseFloat(runningBalance.toFixed(2)) };
    });

    const totalEarned = parseFloat(entries.reduce((a, e) => a + e.calculatedAmount, 0).toFixed(2));
    const totalPaid = parseFloat(entries.filter(e => e.status === 'Paid').reduce((a, e) => a + e.calculatedAmount, 0).toFixed(2));
    const outstanding = parseFloat((totalEarned - totalPaid).toFixed(2));

    res.json({ ledger: ledger.reverse(), totalEarned, totalPaid, outstanding });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVendorPerformance = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const entries = await VendorCommission.find({ vendor: req.params.id }).sort({ createdAt: 1 });
    const paidEntries = entries.filter(e => e.status === 'Paid');

    const totalEntries = entries.length;
    const onTimePaymentRate = totalEntries ? parseFloat(((paidEntries.length / totalEntries) * 100).toFixed(1)) : null;

    const settlementDays = paidEntries
      .filter(e => e.paidAt)
      .map(e => Math.max(0, Math.round((new Date(e.paidAt) - new Date(e.createdAt)) / 864e5)));
    const avgSettlementDays = settlementDays.length
      ? parseFloat((settlementDays.reduce((a, d) => a + d, 0) / settlementDays.length).toFixed(1))
      : null;

    res.json({
      totalEntries,
      paidEntries: paidEntries.length,
      onTimePaymentRate,
      avgSettlementDays,
      activeSince: vendor.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCommissionSummary = async (_req, res) => {
  try {
    const [pending, paid] = await Promise.all([
      VendorCommission.find({ status: 'Pending' }),
      VendorCommission.find({ status: 'Paid' }),
    ]);
    const sum = (arr) => arr.reduce((a, e) => a + (e.calculatedAmount || 0), 0);
    res.json({
      pendingCount: pending.length, pendingTotal: parseFloat(sum(pending).toFixed(2)),
      paidCount: paid.length, paidTotal: parseFloat(sum(paid).toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
