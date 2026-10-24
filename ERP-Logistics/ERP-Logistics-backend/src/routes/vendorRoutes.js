const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendorController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadVendor');

// Vendor Management is a Super Admin-only module.
router.get('/commissions/summary', protect, ctrl.getCommissionSummary);
router.get('/commissions',         protect, ctrl.getVendorCommissions);
router.post('/commissions',        protect, ctrl.createVendorCommission);
router.patch('/commissions/:id/status', protect, ctrl.updateVendorCommissionStatus);
router.delete('/commissions/:id',  protect, ctrl.deleteVendorCommission);

router.get('/',                protect, ctrl.getVendors);
router.post('/',               protect, ctrl.createVendor);
router.get('/:id',             protect, ctrl.getVendorById);
router.patch('/:id',           protect, ctrl.updateVendor);
router.delete('/:id',          protect, ctrl.deleteVendor);
router.patch('/:id/documents', protect, upload.single('file'), ctrl.uploadVendorDocument);
router.get('/:id/ledger',      protect, ctrl.getVendorLedger);
router.get('/:id/performance', protect, ctrl.getVendorPerformance);

module.exports = router;
