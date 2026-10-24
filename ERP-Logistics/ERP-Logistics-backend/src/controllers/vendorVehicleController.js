const VendorVehicle = require('../models/VendorVehicle');
const VendorTripEntry = require('../models/VendorTripEntry');

exports.getVehicles = async (req, res) => {
  try {
    const { vendorId } = req.query;
    if (!vendorId) return res.status(400).json({ message: 'vendorId is required' });
    res.json(await VendorVehicle.find({ vendor: vendorId }).sort({ createdAt: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createVehicle = async (req, res) => {
  try {
    const { vendorId, vehicleNo, notes } = req.body;
    if (!vendorId || !vehicleNo) return res.status(400).json({ message: 'vendorId and vehicleNo are required' });
    const vehicle = await VendorVehicle.create({ vendor: vendorId, vehicleNo: vehicleNo.trim(), notes: notes || '' });
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'This vehicle is already registered under this vendor.' });
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await VendorVehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    const inUse = await VendorTripEntry.countDocuments({ vendor: vehicle.vendor, vehicleNo: vehicle.vehicleNo });
    res.json({ message: 'Deleted', tripEntriesRetained: inUse });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
