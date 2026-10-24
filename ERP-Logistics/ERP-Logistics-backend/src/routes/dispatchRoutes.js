const express = require('express');
const router = express.Router();
const { getAll, create, update, updateStatus, remove } = require('../controllers/dispatchController');
const { protectUser } = require('../middleware/auth');

router.get('/', protectUser, getAll);
router.post('/', protectUser, create);
router.put('/:id', protectUser, update);
router.patch('/:id/status', protectUser, updateStatus);
router.delete('/:id', protectUser, remove);

module.exports = router;
