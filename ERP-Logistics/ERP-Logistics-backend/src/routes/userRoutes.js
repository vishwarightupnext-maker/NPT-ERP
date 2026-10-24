const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser, approveUser, rejectUser, getPendingCount } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/pending-count', protect, getPendingCount);
router.get('/', protect, getUsers);
router.post('/', protect, createUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);
router.patch('/:id/approve', protect, approveUser);
router.delete('/:id/reject', protect, rejectUser);

module.exports = router;
