const mongoose = require('mongoose');

const rowSchema = new mongoose.Schema({
  truckNo:     { type: String, default: '' },
  lrNo:        { type: String, default: '' },
  lrDate:      { type: Date },
  invNo:       { type: String, default: '' },
  invDate:     { type: Date },
  dealerName:  { type: String, default: '' },
  destination: { type: String, default: '' },
  st:          { type: String, default: '' },
  qty:         { type: Number, default: 0 },
  googleKm:    { type: Number, default: 0 },
  agreedRate:  { type: Number, default: 0 },
  totalCost:   { type: Number, default: 0 },
  ratePer100:  { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNo:       { type: String, unique: true },
  invoiceDate:     { type: Date, default: Date.now },

  // Bill To
  billTo:          { type: String, default: '' },
  billToAddress:   { type: String, default: '' },
  billToGST:       { type: String, default: '' },

  // LR rows
  rows:            { type: [rowSchema], default: [] },

  // Charges
  multiDelivery:   { type: Number, default: 0 },
  subtotal:        { type: Number, default: 0 },
  sgstPct:         { type: Number, default: 2.5 },
  cgstPct:         { type: Number, default: 2.5 },
  sgstAmount:      { type: Number, default: 0 },
  cgstAmount:      { type: Number, default: 0 },
  grandTotal:      { type: Number, default: 0 },

  // Bank
  bankAccountName: { type: String, default: 'New Popular Transport' },
  bankAccountNo:   { type: String, default: '' },
  bankName:        { type: String, default: '' },
  branchName:      { type: String, default: '' },
  ifsc:            { type: String, default: '' },

  remarks:         { type: String, default: '' },
  status: { type: String, enum: ['Draft','Sent','Paid','Overdue'], default: 'Draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

invoiceSchema.pre('save', async function () {
  if (this.invoiceNo) return;
  const count = await mongoose.model('Invoice').countDocuments();
  this.invoiceNo = `NPT/AST/${new Date().getFullYear() % 100}-${new Date().getFullYear() % 100 + 1}/${String(count + 1).padStart(3, '0')}`;
});

module.exports = mongoose.model('Invoice', invoiceSchema);
