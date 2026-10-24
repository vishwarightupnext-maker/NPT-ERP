const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, default: '' },
  employeeId:   { type: String, default: '' },
  department:   { type: String, default: '' },
  leaveType:    { type: String, enum: ['Sick Leave','Casual Leave','Annual Leave','Maternity Leave','Paternity Leave','Emergency Leave'], required: true },
  fromDate:     { type: Date, required: true },
  toDate:       { type: Date, required: true },
  days:         { type: Number, default: 1 },
  reason:       { type: String, default: '' },
  status:       { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
