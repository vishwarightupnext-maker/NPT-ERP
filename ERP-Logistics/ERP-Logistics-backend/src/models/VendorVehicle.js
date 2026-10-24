const mongoose = require('mongoose');

// A vehicle registered under a vendor's own fleet — kept separate from the
// company's internal Vehicle Management collection since vendor trucks are
// subcontracted, not company-owned.
const vendorVehicleSchema = new mongoose.Schema({
  vendor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vehicleNo: { type: String, required: true },
  notes:     { type: String, default: '' },
}, { timestamps: true });

vendorVehicleSchema.index({ vendor: 1, vehicleNo: 1 }, { unique: true });

module.exports = mongoose.model('VendorVehicle', vendorVehicleSchema);
