const Vehicle  = require('../models/Vehicle');
const Dispatch = require('../models/Dispatch');

const fileUrl = (file) => (file ? `/uploads/vehicles/${file.filename}` : '');
const EXPIRY_WARNING_DAYS = 30;

const DOC_MAP = {
  rc:        { copyField: 'rcCopy',        numberField: 'rcDetails' },
  insurance: { copyField: 'insuranceCopy', numberField: 'insurance',            expiryField: 'insuranceExpiry' },
  permit:    { copyField: 'permitCopy',    numberField: 'permit',               expiryField: 'permitExpiry' },
  fitness:   { copyField: 'fitnessCopy',   numberField: 'fitnessCertificate',   expiryField: 'fitnessExpiry' },
  pollution: { copyField: 'pollutionCopy', numberField: 'pollutionCertificate', expiryField: 'pollutionExpiry' },
};

function expiryStatus(date) {
  if (!date) return null;
  const days = Math.ceil((new Date(date) - Date.now()) / 864e5);
  if (days < 0) return 'Expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'Expiring Soon';
  return 'Valid';
}

function withCompliance(vehicleDoc) {
  const v = vehicleDoc.toObject ? vehicleDoc.toObject() : vehicleDoc;
  return {
    ...v,
    insuranceExpiryStatus: expiryStatus(v.insuranceExpiry),
    permitExpiryStatus:    expiryStatus(v.permitExpiry),
    fitnessExpiryStatus:   expiryStatus(v.fitnessExpiry),
    pollutionExpiryStatus: expiryStatus(v.pollutionExpiry),
  };
}

/* ── Vehicle CRUD ─────────────────────────────────────────────────────────── */

exports.getVehicles = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles.map(withCompliance));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(withCompliance(vehicle));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const b = req.body;
    const files = req.files || {};
    const documents = {};
    Object.entries(DOC_MAP).forEach(([key, map]) => {
      const file = files[`${key}Doc`]?.[0];
      if (file) documents[map.copyField] = fileUrl(file);
    });

    const vehicle = await Vehicle.create({
      ...b,
      capacityTons: Number(b.capacityTons) || 0,
      documents,
    });
    res.status(201).json(withCompliance(vehicle));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const b = req.body;
    const update = {};
    ['registrationNo', 'type', 'capacity', 'fuelType', 'rcDetails', 'insurance', 'permit',
      'fitnessCertificate', 'pollutionCertificate', 'owner', 'vehicleStatus'].forEach((k) => {
      if (b[k] !== undefined) update[k] = b[k];
    });
    if (b.capacityTons !== undefined) update.capacityTons = Number(b.capacityTons) || 0;
    if (b.insuranceExpiry) update.insuranceExpiry = b.insuranceExpiry;
    if (b.permitExpiry) update.permitExpiry = b.permitExpiry;
    if (b.fitnessExpiry) update.fitnessExpiry = b.fitnessExpiry;
    if (b.pollutionExpiry) update.pollutionExpiry = b.pollutionExpiry;

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(withCompliance(vehicle));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload/renew a single document scan (rc/insurance/permit/fitness/pollution),
// optionally syncing the paired number/expiry fields on the vehicle.
exports.uploadVehicleDocument = async (req, res) => {
  try {
    const { docType, number, expiryDate } = req.body;
    const map = DOC_MAP[docType];
    if (!map) return res.status(400).json({ message: 'Invalid document type' });
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    vehicle.documents = vehicle.documents || {};
    vehicle.documents[map.copyField] = fileUrl(req.file);
    if (number) vehicle[map.numberField] = number;
    if (map.expiryField && expiryDate) vehicle[map.expiryField] = expiryDate;
    await vehicle.save();
    res.json(withCompliance(vehicle));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVehicleStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVehicleSlot = async (req, res) => {
  try {
    const { date, time, notes } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { slot: { date, time, notes } },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    vehicle.orderStatus = status;
    vehicle.statusHistory.push({ status, updatedAt: new Date() });
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin assigns (or reassigns) the driver for a vehicle — auto-approved.
exports.assignDriver = async (req, res) => {
  try {
    const { driverId, driverName } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    vehicle.driverAssignment = { driver: driverId || null, driverName: driverName || '', status: 'Approved' };
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// SuperAdmin approves/rejects the vehicle's driver assignment.
exports.approveDriver = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!vehicle.driverAssignment?.driver) return res.status(400).json({ message: 'No driver assigned yet.' });

    vehicle.driverAssignment.status = status;
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Vehicle Service History ─────────────────────────────────────────────── */

exports.addVehicleService = async (req, res) => {
  try {
    const { date, description, cost, odometerKm, serviceCenter } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    vehicle.serviceHistory.push({
      date: date || new Date(), description: description || '',
      cost: Number(cost) || 0, odometerKm: Number(odometerKm) || 0, serviceCenter: serviceCenter || '',
    });
    await vehicle.save();
    res.status(201).json(withCompliance(vehicle));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Compliance, Availability & Trip History ─────────────────────────────── */

exports.getComplianceAlerts = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find({ vehicleStatus: { $ne: 'Inactive' } });
    const alerts = [];
    vehicles.forEach((v) => {
      [
        ['Insurance', v.insuranceExpiry],
        ['Permit', v.permitExpiry],
        ['Fitness Certificate', v.fitnessExpiry],
        ['Pollution Certificate', v.pollutionExpiry],
      ].forEach(([docType, date]) => {
        const stat = expiryStatus(date);
        if (stat && stat !== 'Valid') {
          alerts.push({ vehicleId: v._id, registrationNo: v.registrationNo, docType, status: stat, expiryDate: date });
        }
      });
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVehicleOverview = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const trips = await Dispatch.find({ vehicle: vehicle.registrationNo }).sort({ scheduledDate: -1 });
    const currentTrip = trips.find((t) => ['Pending', 'Approved', 'In Transit'].includes(t.status)) || null;

    let availabilityStatus = 'Available';
    if (vehicle.vehicleStatus === 'Under Maintenance') availabilityStatus = 'Under Maintenance';
    else if (vehicle.vehicleStatus === 'Inactive') availabilityStatus = 'Inactive';
    else if (currentTrip && currentTrip.status === 'In Transit') availabilityStatus = 'On Trip';

    res.json({ trips, currentTrip, availabilityStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fleet-wide availability snapshot — used by the "32 Feet Truck Support" /
// fleet capacity tab to show type, capacity and current allocation at a glance.
exports.getFleetAvailability = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().select('registrationNo type capacity capacityTons vehicleStatus status');
    const activeDispatches = await Dispatch.find({ status: { $in: ['Approved', 'In Transit'] } })
      .select('vehicle status dispatchNo from to');
    const activeByVehicle = {};
    activeDispatches.forEach((d) => { activeByVehicle[d.vehicle] = d; });

    const result = vehicles.map((v) => {
      const activeTrip = activeByVehicle[v.registrationNo];
      let availabilityStatus = 'Available';
      if (v.vehicleStatus === 'Under Maintenance') availabilityStatus = 'Under Maintenance';
      else if (v.vehicleStatus === 'Inactive') availabilityStatus = 'Inactive';
      else if (activeTrip) availabilityStatus = 'On Trip';

      return {
        vehicleId: v._id, registrationNo: v.registrationNo, type: v.type,
        capacity: v.capacity, capacityTons: v.capacityTons,
        vehicleStatus: v.vehicleStatus, approvalStatus: v.status, availabilityStatus,
        activeTrip: activeTrip
          ? { dispatchNo: activeTrip.dispatchNo, from: activeTrip.from, to: activeTrip.to, status: activeTrip.status }
          : null,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
