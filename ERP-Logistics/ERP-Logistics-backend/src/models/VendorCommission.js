const mongoose = require('mongoose');

// A single commission ledger entry for a vendor — covers all four commission
// types (Percentage/Fixed/Per Load/Monthly). `rate` is a snapshot of the
// vendor's commission rate at the time this entry was calculated, so later
// rate changes on the Vendor don't retroactively alter historical entries.
const vendorCommissionSchema = new mongoose.Schema({
  vendor:         { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName:     { type: String, default: '' },
  vendorCode:     { type: String, default: '' },
  commissionType: { type: String, enum: ['Percentage', 'Fixed', 'Per Load', 'Monthly'], required: true },
  month:          { type: Number },   // 1–12, applicable for Monthly/Percentage periods
  year:           { type: Number },
  baseAmount:     { type: Number, default: 0 },   // used for Percentage calc
  loadCount:      { type: Number, default: 0 },   // used for Per Load calc
  rate:           { type: Number, default: 0 },   // snapshot of vendor.commissionRate
  calculatedAmount: { type: Number, default: 0 },
  status:         { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paidAt:         { type: Date },
  settlementDate: { type: Date },
  notes:          { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('VendorCommission', vendorCommissionSchema);
