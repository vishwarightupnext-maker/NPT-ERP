const mongoose = require('mongoose');

const driverLeaveSchema = new mongoose.Schema({
  driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverName: { type: String, default: '' },
  driverCode: { type: String, default: '' },
  leaveType:  { type: String, enum: ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Emergency Leave'], required: true },
  fromDate:   { type: Date, required: true },
  toDate:     { type: Date, required: true },
  days:       { type: Number, default: 1 },
  reason:     { type: String, default: '' },
  status:     { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('DriverLeave', driverLeaveSchema);
