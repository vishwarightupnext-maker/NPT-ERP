const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Customer', 'Consignor', 'Consignee'], default: 'Customer' },
  gstNumber: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
