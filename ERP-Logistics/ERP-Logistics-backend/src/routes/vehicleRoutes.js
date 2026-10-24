const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehicleDocument,
  updateVehicleStatus,
  updateVehicleSlot,
  updateOrderStatus,
  assignDriver,
  approveDriver,
  addVehicleService,
  getComplianceAlerts,
  getVehicleOverview,
  getFleetAvailability,
} = require('../controllers/vehicleController');
const { protect, protectAny } = require('../middleware/auth');
const upload = require('../middleware/uploadVehicle');

const registrationUpload = upload.fields([
  { name: 'rcDoc', maxCount: 1 },
  { name: 'insuranceDoc', maxCount: 1 },
  { name: 'permitDoc', maxCount: 1 },
  { name: 'fitnessDoc', maxCount: 1 },
  { name: 'pollutionDoc', maxCount: 1 },
]);

router.get('/compliance/alerts', protectAny, getComplianceAlerts);
router.get('/availability',      protectAny, getFleetAvailability);

router.get('/',                        protectAny, getVehicles);
router.post('/',                       protectAny, registrationUpload, createVehicle); // Admin enters vehicle details
router.get('/:id',                     protectAny, getVehicleById);
router.patch('/:id',                   protectAny, updateVehicle);
router.delete('/:id',                  protectAny, deleteVehicle);
router.patch('/:id/documents',         protectAny, upload.single('file'), uploadVehicleDocument);
router.post('/:id/service',            protectAny, addVehicleService);
router.get('/:id/overview',            protectAny, getVehicleOverview);
router.patch('/:id/status',            protect,    updateVehicleStatus); // SuperAdmin approves
router.patch('/:id/slot',              protectAny, updateVehicleSlot);   // Admin or SuperAdmin can fix the date/time slot
router.patch('/:id/order-status',      protect,    updateOrderStatus);
router.patch('/:id/driver-assignment', protectAny, assignDriver);          // Admin assigns/changes driver
router.patch('/:id/driver-assignment/approve', protect, approveDriver);    // SuperAdmin approves/rejects assignment

module.exports = router;
