const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer, updateCustomerStatus } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getCustomers);
router.post('/', protect, createCustomer);
router.patch('/:id/status', protect, updateCustomerStatus);

module.exports = router;
