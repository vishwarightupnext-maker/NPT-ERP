const express = require('express');
const router = express.Router();
const { getAll, create, updateStatus, remove } = require('../controllers/invoiceController');
const { protectAny } = require('../middleware/auth');

router.get('/', protectAny, getAll);
router.post('/', protectAny, create);
router.patch('/:id/status', protectAny, updateStatus);
router.delete('/:id', protectAny, remove);

module.exports = router;
