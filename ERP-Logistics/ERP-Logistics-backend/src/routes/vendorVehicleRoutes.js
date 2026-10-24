const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendorVehicleController');
const { protect } = require('../middleware/auth');

// Part of Vendor Management — Super Admin-only.
router.get('/',       protect, ctrl.getVehicles);
router.post('/',      protect, ctrl.createVehicle);
router.delete('/:id', protect, ctrl.deleteVehicle);

module.exports = router;
