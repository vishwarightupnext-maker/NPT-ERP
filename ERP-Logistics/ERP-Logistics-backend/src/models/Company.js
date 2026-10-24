const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String },
  code: { type: String },
  gstNumber: { type: String },
  panNumber: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
