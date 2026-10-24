const express = require('express');
const router = express.Router();
const { getCompany, saveCompany } = require('../controllers/companyController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getCompany);
router.post('/', protect, saveCompany);

module.exports = router;
