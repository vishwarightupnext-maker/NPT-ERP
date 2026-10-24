const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName:    { type: String, default: '' },
  employeeId:      { type: String, default: '' },
  department:      { type: String, default: '' },
  designation:     { type: String, default: '' },
  month:           { type: Number, required: true },   // 1–12
  year:            { type: Number, required: true },
  workingDays:     { type: Number, default: 26 },
  presentDays:     { type: Number, default: 26 },
  // Earnings
  basicSalary:     { type: Number, default: 0 },
  hra:             { type: Number, default: 0 },
  ta:              { type: Number, default: 0 },
  da:              { type: Number, default: 0 },
  otherAllowances: { type: Number, default: 0 },
  grossSalary:     { type: Number, default: 0 },
  // Deductions
  pf:              { type: Number, default: 0 },
  esi:             { type: Number, default: 0 },
  tax:             { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  // Net
  netSalary:       { type: Number, default: 0 },
  status:          { type: String, enum: ['Generated','Paid'], default: 'Generated' },
}, { timestamps: true });

module.exports = mongoose.model('Payslip', payslipSchema);
