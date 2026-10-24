const Driver       = require('../models/Driver');
const DriverOtp    = require('../models/DriverOtp');
const Vehicle      = require('../models/Vehicle');
const Dispatch     = require('../models/Dispatch');
const twilioClient = require('../config/twilio');

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// Indian mobile numbers are entered as 10 digits — Twilio Verify requires E.164.
function toE164(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (String(phone).startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

const DOC_FIELDS = [
  'drivingLicense', 'aadhaarCard', 'panCard', 'passport',
  'medicalCertificate', 'policeVerification', 'experienceCertificate',
];

const fileUrl = (file) => (file ? `/uploads/drivers/${file.filename}` : '');

const EXPIRY_WARNING_DAYS = 30;

function expiryStatus(date) {
  if (!date) return null;
  const days = Math.ceil((new Date(date) - Date.now()) / 864e5);
  if (days < 0) return 'Expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'Expiring Soon';
  return 'Valid';
}

function withCompliance(driverDoc) {
  const d = driverDoc.toObject ? driverDoc.toObject() : driverDoc;
  return {
    ...d,
    licenseExpiryStatus: expiryStatus(d.licenseExpiry),
    medicalExpiryStatus: expiryStatus(d.documents?.medicalCertificate?.expiryDate),
  };
}

/* ── Driver Profile / CRUD ─────────────────────────────────────────────── */

exports.getDrivers = async (_req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json(drivers.map(withCompliance));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createDriver = async (req, res) => {
  try {
    // Clean up any legacy records with empty string unique sparse fields
    await Driver.updateMany({ email: '' }, { $unset: { email: 1 } }).catch(() => {});
    await Driver.updateMany({ licenseNo: '' }, { $unset: { licenseNo: 1 } }).catch(() => {});

    const b = req.body;
    const files = req.files || {};

    const documents = {};
    DOC_FIELDS.forEach((key) => {
      const file = files[`${key}Doc`]?.[0];
      // The driving license's number/expiry are captured once as top-level
      // fields (also used for fast compliance queries) rather than duplicated
      // under a drivingLicenseNumber/drivingLicenseExpiry pair.
      const number = key === 'drivingLicense' ? (b.licenseNo || '') : (b[`${key}Number`] || '');
      const expiryDate = key === 'drivingLicense' ? (b.licenseExpiry || undefined) : (b[`${key}Expiry`] || undefined);
      if (file || number || expiryDate) {
        documents[key] = {
          fileUrl: file ? fileUrl(file) : '',
          number,
          expiryDate,
          uploadedAt: file ? new Date() : undefined,
        };
      }
    });

    const driverData = {
      name: b.name,
      dob: b.dob || undefined,
      address: b.address,
      aadhaar: b.aadhaar,
      pan: b.pan || '',
      bloodGroup: b.bloodGroup || '',
      phone: b.phone,
      emergencyContact: b.emergencyContactName && b.emergencyContactPhone
        ? `${b.emergencyContactName} (${b.emergencyContactPhone})`
        : (b.emergencyContact || ''),
      emergencyContactName: b.emergencyContactName || '',
      emergencyContactPhone: b.emergencyContactPhone || '',
      photo: fileUrl(files.photo?.[0]),
      signature: fileUrl(files.signature?.[0]),
      licenseExpiry: b.licenseExpiry || undefined,
      documents,
      assignment: b.assignment || '',
      salary: Number(b.salary) || 0,
      driverStatus: b.driverStatus || 'Active',
      mobileVerified: b.mobileVerified === 'true',
      emergencyContactVerified: b.emergencyContactVerified === 'true',
    };

    if (b.email && b.email.trim()) {
      driverData.email = b.email.toLowerCase().trim();
    }
    if (b.licenseNo && b.licenseNo.trim()) {
      driverData.licenseNo = b.licenseNo.trim();
    }

    const driver = await Driver.create(driverData);

    res.status(201).json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const b = req.body;
    const update = {};
    ['name', 'address', 'aadhaar', 'pan', 'bloodGroup', 'phone',
      'emergencyContactName', 'emergencyContactPhone', 'licenseNo', 'salary', 'email'].forEach((k) => {
      if (b[k] === undefined) return;
      if (k === 'salary') update[k] = Number(b[k]) || 0;
      else if (k === 'email') {
        const val = b.email ? b.email.toLowerCase().trim() : '';
        if (val) update.email = val;
        else update.$unset = { ...(update.$unset || {}), email: 1 };
      }
      else if (k === 'licenseNo') {
        const val = b.licenseNo ? b.licenseNo.trim() : '';
        if (val) update.licenseNo = val;
        else update.$unset = { ...(update.$unset || {}), licenseNo: 1 };
      }
      else update[k] = b[k];
    });
    if (b.dob) update.dob = b.dob;
    if (b.licenseExpiry) update.licenseExpiry = b.licenseExpiry;
    if (b.emergencyContactName && b.emergencyContactPhone) {
      update.emergencyContact = `${b.emergencyContactName} (${b.emergencyContactPhone})`;
    }

    const driver = await Driver.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDriverMedia = async (req, res) => {
  try {
    const files = req.files || {};
    const update = {};
    if (files.photo?.[0]) update.photo = fileUrl(files.photo[0]);
    if (files.signature?.[0]) update.signature = fileUrl(files.signature[0]);
    const driver = await Driver.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload/renew a single document, or append to the free-form "others" list.
exports.uploadDriverDocument = async (req, res) => {
  try {
    const { docType, number, expiryDate, otherName } = req.body;
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    if (docType === 'others') {
      driver.documents.others.push({ name: otherName || 'Document', fileUrl: fileUrl(req.file) });
    } else {
      if (!DOC_FIELDS.includes(docType)) return res.status(400).json({ message: 'Invalid document type' });
      driver.documents[docType] = {
        fileUrl: fileUrl(req.file),
        number: number || driver.documents[docType]?.number || '',
        expiryDate: expiryDate || driver.documents[docType]?.expiryDate,
        uploadedAt: new Date(),
      };
      if (docType === 'drivingLicense') {
        if (number) driver.licenseNo = number;
        if (expiryDate) driver.licenseExpiry = expiryDate;
      }
    }
    await driver.save();
    res.json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDriverStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    driver.status = req.body.status;
    await driver.save();
    res.json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDriverOperationalStatus = async (req, res) => {
  try {
    const { driverStatus } = req.body;
    if (!['Active', 'Inactive', 'Suspended'].includes(driverStatus)) {
      return res.status(400).json({ message: 'Invalid driver status' });
    }
    const driver = await Driver.findByIdAndUpdate(req.params.id, { driverStatus }, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(withCompliance(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Assignment overview (read-only aggregation over Vehicle + Dispatch) ─── */

async function buildOverview(driver) {
  const vehicles = await Vehicle.find({ 'driverAssignment.driver': driver._id })
    .select('registrationNo type driverAssignment status');

  const currentAssignments = vehicles.map((v) => ({
    vehicleId: v._id, registrationNo: v.registrationNo, type: v.type,
    status: v.driverAssignment.status,
  }));

  const trips = await Dispatch.find({ driver: driver.name }).sort({ scheduledDate: -1 });
  const currentTrip = trips.find((t) => ['Pending', 'Approved', 'In Transit'].includes(t.status)) || null;

  return { currentAssignments, trips, currentTrip };
}

exports.getDriverOverview = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(await buildOverview(driver));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Expiry & Compliance ──────────────────────────────────────────────── */

exports.getComplianceAlerts = async (_req, res) => {
  try {
    const drivers = await Driver.find({ driverStatus: { $ne: 'Inactive' } });
    const alerts = [];
    drivers.forEach((d) => {
      const licenseStat = expiryStatus(d.licenseExpiry);
      const medicalStat = expiryStatus(d.documents?.medicalCertificate?.expiryDate);
      if (licenseStat && licenseStat !== 'Valid') {
        alerts.push({ driverId: d._id, driverCode: d.driverCode, name: d.name, docType: 'Driving License', status: licenseStat, expiryDate: d.licenseExpiry });
      }
      if (medicalStat && medicalStat !== 'Valid') {
        alerts.push({ driverId: d._id, driverCode: d.driverCode, name: d.name, docType: 'Medical Certificate', status: medicalStat, expiryDate: d.documents.medicalCertificate.expiryDate });
      }
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── OTP Verification (Twilio Verify — real SMS) ─────────────────────────── */

exports.sendOtp = async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    const driverId = req.body.driverId || req.params.id;
    if (!phone || !purpose) return res.status(400).json({ message: 'phone and purpose are required' });
    if (!['mobile', 'emergencyContact', 'mobileChange'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid purpose' });
    }

    const to = toE164(phone);
    const verification = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to, channel: 'sms' });

    await DriverOtp.create({ driver: driverId || undefined, phone, purpose, action: 'send', status: verification.status });
    res.json({ message: 'OTP sent via SMS', status: verification.status });
  } catch (err) {
    await DriverOtp.create({
      driver: req.body.driverId || undefined, phone: req.body.phone || '', purpose: req.body.purpose || 'mobile',
      action: 'send', status: 'error', errorMessage: err.message,
    }).catch(() => {});
    res.status(500).json({ message: err.message || 'Failed to send OTP' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, purpose } = req.body;
    const driverId = req.body.driverId || req.params.id;
    if (!phone || !otp || !purpose) return res.status(400).json({ message: 'phone, otp and purpose are required' });

    const to = toE164(phone);
    const check = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to, code: otp });

    const verified = check.status === 'approved';
    await DriverOtp.create({
      driver: driverId || undefined, phone, purpose, action: 'verify',
      status: check.status, verified, verifiedAt: verified ? new Date() : undefined,
    });

    if (!verified) return res.status(400).json({ message: 'Invalid or expired OTP' });

    if (driverId) {
      const driver = await Driver.findById(driverId);
      if (driver) {
        if (purpose === 'mobile') driver.mobileVerified = true;
        if (purpose === 'emergencyContact') driver.emergencyContactVerified = true;
        if (purpose === 'mobileChange') driver.phone = phone;
        driver.identityVerified = driver.mobileVerified && driver.emergencyContactVerified;
        await driver.save();
      }
    }

    res.json({ message: 'OTP verified' });
  } catch (err) {
    await DriverOtp.create({
      driver: req.body.driverId || undefined, phone: req.body.phone || '', purpose: req.body.purpose || 'mobile',
      action: 'verify', status: 'error', verified: false, errorMessage: err.message,
    }).catch(() => {});
    res.status(400).json({ message: err.message || 'Invalid or expired OTP' });
  }
};

exports.getOtpLogs = async (req, res) => {
  try {
    const { driverId, phone } = req.query;
    const q = {};
    if (driverId) q.driver = driverId;
    if (phone) q.phone = phone;
    res.json(await DriverOtp.find(q).sort({ createdAt: -1 }).limit(200));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
