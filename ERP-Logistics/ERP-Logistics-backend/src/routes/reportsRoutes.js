const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

router.get('/daily-trips',   protect, ctrl.dailyTrips);
router.get('/monthly-trips', protect, ctrl.monthlyTrips);
router.get('/vehicles',      protect, ctrl.vehicleReport);
router.get('/drivers',       protect, ctrl.driverReport);
router.get('/vendors',       protect, ctrl.vendorReport);
router.get('/customers',     protect, ctrl.customerReport);
router.get('/invoices',      protect, ctrl.invoiceReport);
router.get('/expenses',      protect, ctrl.expenseReport);
router.get('/diesel',        protect, ctrl.dieselReport);
router.get('/profit-loss',   protect, ctrl.profitLossReport);
router.get('/gst',           protect, ctrl.gstReport);
router.get('/outstanding',   protect, ctrl.outstandingReport);
router.get('/collection',    protect, ctrl.collectionReport);

module.exports = router;
