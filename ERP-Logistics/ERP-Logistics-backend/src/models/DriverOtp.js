const mongoose = require('mongoose');

// Audit log for Driver Verification & Authentication. The OTP itself is
// generated and validated by Twilio Verify — we only log the outcome of
// each send/check request here (no OTP code is ever stored locally).
const driverOtpSchema = new mongoose.Schema({
  driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  phone:      { type: String, required: true },
  purpose:    { type: String, enum: ['mobile', 'emergencyContact', 'mobileChange'], required: true },
  action:     { type: String, enum: ['send', 'verify'], required: true },
  status:     { type: String, default: '' },   // Twilio verification status: pending/approved/denied/canceled/error
  verified:   { type: Boolean, default: false },
  verifiedAt: { type: Date },
  errorMessage: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('DriverOtp', driverOtpSchema);
