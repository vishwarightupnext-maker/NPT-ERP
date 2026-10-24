const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'Created',
  'Approved',
  'LR Generated',
  'Ready for Dispatch',
  'In Transit',
  'Delivered',
  'POD Completed',
  'Billing Closed',
];

const vehicleSchema = new mongoose.Schema({
  registrationNo:        { type: String, required: true, unique: true },
  type:                  { type: String, required: true },   // includes '32 Feet Truck' (see VEHICLE_TYPES on the frontend)
  capacity:              { type: String, required: true },    // free-text display value, e.g. "9 Tons"
  capacityTons:          { type: Number, default: 0 },         // numeric value for capacity-based filtering/allocation
  fuelType:              { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'Electric'], required: true },

  // Vehicle Documents — number/details kept as top-level strings (existing
  // behaviour), each paired with an optional expiry date for compliance
  // tracking, plus an optional scanned copy under `documents`.
  rcDetails:             { type: String, required: true },
  insurance:             { type: String, required: true },
  insuranceExpiry:       { type: Date },
  permit:                { type: String, required: true },
  permitExpiry:          { type: Date },
  fitnessCertificate:    { type: String, default: '' },
  fitnessExpiry:         { type: Date },
  pollutionCertificate:  { type: String, required: true },
  pollutionExpiry:       { type: Date },
  documents: {
    rcCopy:         { type: String, default: '' },
    insuranceCopy:  { type: String, default: '' },
    permitCopy:     { type: String, default: '' },
    fitnessCopy:    { type: String, default: '' },
    pollutionCopy:  { type: String, default: '' },
  },

  // Vehicle Service History
  serviceHistory: [{
    date:          { type: Date, default: Date.now },
    description:   { type: String, default: '' },
    cost:          { type: Number, default: 0 },
    odometerKm:    { type: Number, default: 0 },
    serviceCenter: { type: String, default: '' },
  }],

  vehicleStatus:         { type: String, enum: ['Active', 'Inactive', 'Under Maintenance'], default: 'Active' },
  owner:                 { type: String, required: true },
  status:                { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
  slot: {
    date:  { type: Date },
    time:  { type: String },
    notes: { type: String },
  },
  orderStatus:   { type: String, enum: ORDER_STATUSES, default: 'Created' },
  statusHistory: [{ status: { type: String }, updatedAt: { type: Date, default: Date.now } }],
  // Driver assigned to this vehicle. Auto-approved.
  driverAssignment: {
    driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    driverName: { type: String, default: '' },
    status:     { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
