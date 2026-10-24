const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, updateStatus, remove } = require('../controllers/lrController');
const { protectUser } = require('../middleware/auth');

router.get('/', protectUser, getAll);
router.get('/:id', protectUser, getById);
router.post('/', protectUser, create);
router.put('/:id', protectUser, update);
router.patch('/:id/status', protectUser, updateStatus);
router.delete('/:id', protectUser, remove);

module.exports = router;
