const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/routeController');
const { protectUser } = require('../middleware/auth');

router.get('/', protectUser, getAll);
router.post('/', protectUser, create);
router.put('/:id', protectUser, update);
router.delete('/:id', protectUser, remove);

module.exports = router;
