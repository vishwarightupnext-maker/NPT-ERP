const mongoose = require('mongoose');

const driverPayslipSchema = new mongoose.Schema({
  driver:         { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverName:     { type: String, default: '' },
  driverCode:     { type: String, default: '' },
  month:          { type: Number, required: true },   // 1–12
  year:           { type: Number, required: true },
  // Earnings
  monthlySalary:  { type: Number, default: 0 },
  tripCount:      { type: Number, default: 0 },
  perTripRate:    { type: Number, default: 0 },
  perTripPayment: { type: Number, default: 0 },
  incentives:     { type: Number, default: 0 },
  overtimeHours:  { type: Number, default: 0 },
  overtimeRate:   { type: Number, default: 0 },
  overtimeAmount: { type: Number, default: 0 },
  grossSalary:    { type: Number, default: 0 },
  // Deductions
  advanceSalary:  { type: Number, default: 0 },
  deductions:     { type: Number, default: 0 },
  totalDeductions:{ type: Number, default: 0 },
  // Net
  netSalary:      { type: Number, default: 0 },
  status:         { type: String, enum: ['Generated', 'Paid'], default: 'Generated' },
  paidAt:         { type: Date },
}, { timestamps: true });

// One payslip per driver per month/year.
driverPayslipSchema.index({ driver: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('DriverPayslip', driverPayslipSchema);
