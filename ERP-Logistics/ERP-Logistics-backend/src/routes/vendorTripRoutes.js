const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendorTripController');
const { protect } = require('../middleware/auth');

// Part of Vendor Management — Super Admin-only.
router.get('/summary',  protect, ctrl.getVendorTripSummary);

router.get('/',       protect, ctrl.getEntries);
router.post('/',      protect, ctrl.createEntry);
router.patch('/:id',  protect, ctrl.updateEntry);
router.delete('/:id', protect, ctrl.deleteEntry);
 
module.exports = router;
