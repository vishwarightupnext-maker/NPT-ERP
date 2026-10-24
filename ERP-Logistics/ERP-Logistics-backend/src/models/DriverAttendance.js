const mongoose = require('mongoose');

const driverAttendanceSchema = new mongoose.Schema({
  driver:         { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverCode:     String,
  driverName:     String,
  date:           { type: String, required: true },   // YYYY-MM-DD
  clockIn:        String,                              // HH:mm
  clockOut:       String,
  hoursWorked:    { type: Number, default: 0 },
  status:         { type: String, enum: ['Present', 'Half Day', 'Absent', 'On Leave'], default: 'Present' },
  tripAttendance: { type: Boolean, default: false },   // driver attended an assigned trip that day
  notes:          String,
}, { timestamps: true });

module.exports = mongoose.model('DriverAttendance', driverAttendanceSchema);
