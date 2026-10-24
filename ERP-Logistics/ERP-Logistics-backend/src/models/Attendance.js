const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeCode: String,
  employeeName: String,
  date:         { type: String, required: true },   // YYYY-MM-DD
  clockIn:      String,                              // HH:mm
  clockOut:     String,
  hoursWorked:  { type: Number, default: 0 },
  status:       { type: String, enum: ['Present', 'Half Day', 'Absent'], default: 'Present' },
  notes:        String,
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
