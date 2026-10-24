const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  noOfVehicles: { type: Number, default: 1 },
  remarks:      { type: String, default: '' },
}, { _id: false });

const dispatchSchema = new mongoose.Schema({
  dispatchNo:    { type: String, unique: true },
  vehicle:       { type: String, required: true },  // registration number
  driver:        { type: String, required: true },  // driver name
  from:          { type: String, required: true },
  to:            { type: String, required: true },
  destinations:  [stopSchema],
  goods:         { type: String, required: true },
  weight:        { type: Number, default: 0 },
  pieces:        { type: Number, default: 0 },
  scheduledDate: { type: Date, required: true },
  liveLocation:  { type: String, default: '' },
  distance:      { type: Number, default: 0 },   // km — used for Driver Performance (Distance Travelled)
  deliveredAt:   { type: Date },                  // set when status flips to Delivered — used for on-time % calc
  rating:        { type: Number, min: 1, max: 5 }, // customer rating for this trip
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'In Transit', 'Delivered', 'Cancelled'],
    default: 'Approved',
  },
  notes:     { type: String, default: '' },
  lrNumber:  { type: String, default: '' },
  remarks:   { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

dispatchSchema.pre('save', async function () {
  if (this.dispatchNo) return;
  const count = await mongoose.model('Dispatch').countDocuments();
  this.dispatchNo = `DSP-${String(count + 1).padStart(4, '0')}`;
});

module.exports = mongoose.model('Dispatch', dispatchSchema);
