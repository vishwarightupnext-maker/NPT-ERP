const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  fileUrl:    { type: String, default: '' },
  number:     { type: String, default: '' },
  expiryDate: { type: Date },
  uploadedAt: { type: Date },
}, { _id: false });

const driverSchema = new mongoose.Schema({
  driverCode: { type: String, unique: true },

  // Driver Profile
  name:                    { type: String, required: true },
  dob:                     { type: Date },
  address:                 { type: String, default: '' },
  aadhaar:                 { type: String, default: '' },
  pan:                     { type: String, default: '' },
  bloodGroup:              { type: String, default: '' },
  phone:                   { type: String, default: '' },
  // Links this record to the ERP User login (role "Driver") for the self-service
  // Driver Portal. Set automatically when Super Admin assigns the Driver role —
  // sparse so multiple unlinked profiles (no email yet) don't collide on the
  // unique index.
  email:                   { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  emergencyContact:        { type: String, default: '' },       // legacy combined field, kept for back-compat
  emergencyContactName:    { type: String, default: '' },
  emergencyContactPhone:   { type: String, default: '' },

  // Photo & Identity Capture
  photo:      { type: String, default: '' },
  signature:  { type: String, default: '' },

  // License (top-level for fast compliance queries) — filled in by Admin once
  // KYC/registration is completed; a freshly auto-created profile has none yet.
  licenseNo:      { type: String, unique: true, sparse: true },
  licenseExpiry:  { type: Date },

  // Driver Documents
  documents: {
    drivingLicense:        { type: documentSchema, default: () => ({}) },
    aadhaarCard:            { type: documentSchema, default: () => ({}) },
    panCard:                { type: documentSchema, default: () => ({}) },
    passport:               { type: documentSchema, default: () => ({}) },
    medicalCertificate:     { type: documentSchema, default: () => ({}) },
    policeVerification:     { type: documentSchema, default: () => ({}) },
    experienceCertificate:  { type: documentSchema, default: () => ({}) },
    others: [{ name: String, fileUrl: String, uploadedAt: { type: Date, default: Date.now } }],
  },

  // Verification & Authentication
  mobileVerified:            { type: Boolean, default: false },
  emergencyContactVerified:  { type: Boolean, default: false },
  identityVerified:          { type: Boolean, default: false },

  // Assignment (authoritative vehicle assignment lives on Vehicle.driverAssignment;
  // these mirror the driver's current active assignment for quick lookups)
  assignment:  { type: String, default: '' },   // legacy: vehicle registration number
  assignmentHistory: [{
    vehicleNo:    String,
    shift:        String,
    assignedAt:   { type: Date, default: Date.now },
    unassignedAt: Date,
  }],

  salary:        { type: Number, default: 0 },
  driverStatus:  { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  status:        { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
}, { timestamps: true });

driverSchema.pre('save', async function () {
  if (!this.driverCode) {
    const count = await mongoose.model('Driver').countDocuments();
    this.driverCode = `DRV-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Driver', driverSchema);
