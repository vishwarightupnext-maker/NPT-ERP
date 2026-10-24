const mongoose = require('mongoose');

const CATEGORIES = ['Diesel Advance', 'Diesel Expense', 'Cash Advance', 'Driver Cash', 'Toll', 'Food', 'Miscellaneous'];

const tripExpenseSchema = new mongoose.Schema({
  vehicle:        { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  registrationNo: { type: String, required: true },
  dispatchNo:     { type: String, default: '' },
  driverName:     { type: String, default: '' },
  category:       { type: String, enum: CATEGORIES, required: true },
  amount:         { type: Number, required: true, default: 0 },
  liters:         { type: Number, default: 0 },   // Diesel Expense entries — used for mileage/consumption calc
  odometerKm:     { type: Number, default: 0 },
  date:           { type: Date, default: Date.now },
  notes:          { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('TripExpense', tripExpenseSchema);
