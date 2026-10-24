const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId:     { type: String, unique: true },
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, select: false },
  hrmRole:        { type: String, enum: ['HRAdmin', 'Employee'], default: 'Employee' },
  phone:          { type: String, default: '' },
  department:     { type: String, enum: ['Management','Operations','Driver','Finance','HR','Logistics','IT','Sales'], default: 'Operations' },
  designation:    { type: String, default: '' },
  employmentType: { type: String, enum: ['Full-Time','Part-Time','Contract','Intern'], default: 'Full-Time' },
  workFormat:     { type: String, enum: ['On Site','Remote','Bench'], default: 'On Site' },
  joiningDate:    { type: Date },
  salary:         { type: Number, default: 0 },
  status:         { type: String, enum: ['Active','Inactive','On Leave','Terminated'], default: 'Active' },
  address:        { type: String, default: '' },
  aadhaar:        { type: String, default: '' },
  bankAccount:    { type: String, default: '' },
  ifsc:           { type: String, default: '' },
}, { timestamps: true });

employeeSchema.pre('save', async function () {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

employeeSchema.methods.comparePassword = function (candidate) {
  return require('bcryptjs').compare(candidate, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);
