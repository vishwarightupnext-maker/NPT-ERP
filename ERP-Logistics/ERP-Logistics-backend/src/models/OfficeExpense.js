const mongoose = require('mongoose');

const CATEGORIES = [
  'Salary', 'Rent', 'Electricity', 'Internet', 'Fuel',
  'Stationery', 'Maintenance', 'Office Purchase', 'Miscellaneous',
];

const officeExpenseSchema = new mongoose.Schema({
  category:   { type: String, enum: CATEGORIES, required: true },
  department: { type: String, default: '' },
  amount:     { type: Number, required: true, default: 0 },
  date:       { type: Date, default: Date.now },
  paidTo:     { type: String, default: '' },
  notes:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('OfficeExpense', officeExpenseSchema);
