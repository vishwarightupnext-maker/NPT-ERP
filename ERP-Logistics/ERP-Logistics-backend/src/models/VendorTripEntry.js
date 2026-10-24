const mongoose = require('mongoose');

// Mirrors the vendor's own trip ledger sheet: for a vendor-supplied truck,
// diesel + cash advances are paid out for a trip, then settled against the
// trip's total cost (connectivity). Advance and balance are always derived,
// never stored, so they can't drift out of sync with the underlying figures.
const vendorTripEntrySchema = new mongoose.Schema({
  vendor:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName:   { type: String, default: '' },
  docketNo:     { type: String, unique: true },   // auto-generated, one per trip entry
  date:         { type: Date, default: Date.now },
  vehicleNo:    { type: String, required: true }, // vendor's own truck registration
  driverName:   { type: String, default: '' },
  connectivity: { type: Number, default: 0 },     // total cost/freight value for the trip
  diesel:       { type: Number, default: 0 },     // diesel amount advanced
  // Cash advance paid out in installments — e.g. ₹1000 on one date, ₹2000 the
  // next — rather than a single lump sum. `cash` below is always the sum.
  cashEntries: [{
    date:   { type: Date, default: Date.now },
    amount: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
  }],
  settlementEntries: [{
    date:   { type: Date, default: Date.now },
    amount: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
  }],
  settlement:     { type: Number, default: 0 },     // total amount settled against the advance
  settlementDate: { type: Date },                   // dedicated settlement date
  remarks:        { type: String, default: '' },
  pod:            { type: String, default: '' },    // Proof of Delivery reference/status
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

vendorTripEntrySchema.virtual('cash').get(function () {
  return parseFloat((this.cashEntries || []).reduce((a, e) => a + (e.amount || 0), 0).toFixed(2));
});
vendorTripEntrySchema.virtual('settlementTotal').get(function () {
  if (Array.isArray(this.settlementEntries) && this.settlementEntries.length > 0) {
    return parseFloat(this.settlementEntries.reduce((a, e) => a + (e.amount || 0), 0).toFixed(2));
  }
  return parseFloat((this.settlement || 0).toFixed(2));
});
vendorTripEntrySchema.virtual('advance').get(function () {
  return parseFloat(((this.diesel || 0) + this.cash).toFixed(2));
});
vendorTripEntrySchema.virtual('remainDue').get(function () {
  return parseFloat(((this.connectivity || 0) - this.advance).toFixed(2));
});
vendorTripEntrySchema.virtual('balance').get(function () {
  const setAmt = (Array.isArray(this.settlementEntries) && this.settlementEntries.length > 0)
    ? this.settlementTotal
    : (this.settlement || 0);
  return parseFloat(((this.connectivity || 0) - this.advance - setAmt).toFixed(2));
});

vendorTripEntrySchema.pre('save', async function () {
  if (this.docketNo) return;
  const count = await mongoose.model('VendorTripEntry').countDocuments();
  this.docketNo = `DOC-${String(count + 1).padStart(5, '0')}`;
});

module.exports = mongoose.model('VendorTripEntry', vendorTripEntrySchema);
