const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Manager', 'Driver', 'Viewer'], default: 'Admin' },
  status: { type: String, enum: ['Active', 'Inactive', 'Pending'], default: 'Active' },
  // Optional HRM profile fields — populated when this ERP user is also
  // managed as an employee from the HRM Employee Management page.
  department:     { type: String, default: '' },
  designation:    { type: String, default: '' },
  employmentType: { type: String, default: '' },
  workFormat:     { type: String, default: '' },
  joiningDate:    { type: Date },
  salary:         { type: Number, default: 0 },
  address:        { type: String, default: '' },
  aadhaar:        { type: String, default: '' },
  bankAccount:    { type: String, default: '' },
  ifsc:           { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
