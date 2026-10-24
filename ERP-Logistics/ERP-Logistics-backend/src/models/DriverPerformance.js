const mongoose = require('mongoose');

// One document per driver, holding manually-recorded performance signals.
// Trip counts, distance and on-time % are derived live from Dispatch records
// (see driverHRController.getDriverPerformance) rather than stored here.
const driverPerformanceSchema = new mongoose.Schema({
  driver:       { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, unique: true },
  rewardPoints: { type: Number, default: 0 },
  incidents: [{
    date:        { type: Date, default: Date.now },
    description: { type: String, default: '' },
    severity:    { type: String, enum: ['Minor', 'Major', 'Critical'], default: 'Minor' },
  }],
  penalties: [{
    date:   { type: Date, default: Date.now },
    amount: { type: Number, default: 0 },
    reason: { type: String, default: '' },
  }],
  ratings: [{
    date:    { type: Date, default: Date.now },
    rating:  { type: Number, min: 1, max: 5, required: true },
    tripNo:  { type: String, default: '' },
    comment: { type: String, default: '' },
  }],
}, { timestamps: true });

module.exports = mongoose.model('DriverPerformance', driverPerformanceSchema);
