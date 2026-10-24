const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorCode: { type: String, unique: true },
  name:       { type: String, required: true },
  phone:      { type: String, default: '' },
  email:      { type: String, default: '' },
  address:    { type: String, default: '' },

  // GST Details
  gstNumber:  { type: String, default: '' },

  // Vendor Documents
  documents: {
    gstCertificate: { type: String, default: '' },
    panCard:        { type: String, default: '' },
    agreement:      { type: String, default: '' },
    others: [{ name: String, fileUrl: String, uploadedAt: { type: Date, default: Date.now } }],
  },

  // Bank Details
  bankDetails: {
    accountName:   { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc:          { type: String, default: '' },
    bankName:      { type: String, default: '' },
    branchName:    { type: String, default: '' },
  },

  // How this vendor's commission is calculated — the rate's meaning depends
  // on the type: % of base amount, a flat fixed amount, an amount per load,
  // or a flat amount per month.
  commissionType: { type: String, enum: ['Percentage', 'Fixed', 'Per Load', 'Monthly'], default: 'Percentage' },
  commissionRate: { type: Number, default: 0 },

  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

vendorSchema.pre('save', async function () {
  if (!this.vendorCode) {
    const count = await mongoose.model('Vendor').countDocuments();
    this.vendorCode = `VEN-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Vendor', vendorSchema);
