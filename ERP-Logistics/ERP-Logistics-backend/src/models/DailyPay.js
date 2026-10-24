const mongoose = require('mongoose');

const dailyPaySchema = new mongoose.Schema({
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName:    { type: String, default: '' },
  employeeCode:    { type: String, default: '' },
  date:            { type: String, required: true },   // YYYY-MM-DD
  month:           { type: Number, required: true },
  year:            { type: Number, required: true },
  status:    { type: String, enum: ['Present', 'Half Day', 'Absent'], default: 'Present' },
  dailyRate: { type: Number, default: 0 },   // rate per full working day
  amount:    { type: Number, default: 0 },   // actual amount for this day
  notes:     { type: String, default: '' },
}, { timestamps: true });

dailyPaySchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPay', dailyPaySchema);
