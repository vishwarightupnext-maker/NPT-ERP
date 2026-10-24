const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeName:      { type: String, required: true },
  from:           { type: String, required: true },
  to:             { type: String, required: true },
  distance:       { type: Number, default: 0 },
  estimatedHours: { type: Number, default: 0 },
  vehicleType:    { type: String, default: '' },
  waypoints:      { type: [String], default: [] },
  notes:          { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);

 