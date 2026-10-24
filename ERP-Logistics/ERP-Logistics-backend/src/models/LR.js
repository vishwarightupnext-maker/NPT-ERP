const mongoose = require('mongoose');

const lrSchema = new mongoose.Schema({
  lrNo:       { type: String, unique: true },
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },
  dispatchNo: { type: String, default: '' },

  // Auto-filled from dispatchhc
  truckNumber: { type: String, default: '' },
  driver:      { type: String, default: '' },
  from:        { type: String, required: true },
  to:          
  { type: String, required: true },

  expectedDeliveryDate: { type: Date },

  // Consignor
  consignorName:    { type: String, required: true },
  consignorAddress: { type: String, default: '' },
  consignorGST:     { type: String, default: '' },

  // Consignee
  consigneeName:    { type: String, required: true },
  consigneeAddress: { type: String, default: '' },
  consigneeGST:     { type: String, default: '' },

  serviceTaxPayableBy: { type: String, default: '' },

  // Shipment
  shipmentNumber:  { type: String, default: '' },
  insurancePolicy: { type: String, default: '' },
  packingCount:    { type: Number, default: 0 },
  packingType:     { type: String, default: '' },
  dimensions:      { type: String, default: '' },
  privateMarking:  { type: String, default: '' },
  goods:           { type: String, required: true },
  description:     { type: String, default: '' },
  sealNumber:      { type: String, default: '' },

  // Weight
  actualWeight:  { type: Number, default: 0 },
  chargedWeight: { type: Number, default: 0 },

  // Invoice
  invoiceNumber: { type: String, default: '' },
  invoiceValue:  { type: Number, default: 0 },

  // Vehicle
  vehicleType:    { type: String, default: '' },
  basisOfBooking: { type: String, default: '' },

  // Charges
  freightCharges:  { type: Number, default: 0 },
  handlingCharges: { type: Number, default: 0 },
  deliveryCharges: { type: Number, default: 0 },
  tollCharges:     { type: Number, default: 0 },
  miscCharges:     { type: Number, default: 0 },
  grandTotal:      { type: Number, default: 0 },

  paymentType: { type: String, enum: ['Cash', 'Cheque', 'ToPay'], default: 'Cash' },

  // GST
  sgstPct: { type: Number, default: 0 },
  cgstPct: { type: Number, default: 0 },
  igstPct: { type: Number, default: 0 },

  podDetails: { type: String, default: '' },
  images:     [{ type: String }], // Array of 4 image URLs or data URLs

  // Legacy fields kept for backward compatibility
  weight:  { type: Number, default: 0 },
  amount:  { type: Number, default: 0 },
  remarks: { type: String, default: '' },

  status: {
    type: String,
    enum: ['Created', 'In Transit', 'Delivered'],
    default: 'Created',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

lrSchema.pre('save', async function () {
  if (this.lrNo) return;
  const count = await mongoose.model('LR').countDocuments();
  this.lrNo = `LR-${String(count + 1).padStart(5, '0')}`;
});

module.exports = mongoose.model('LR', lrSchema);
