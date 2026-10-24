const express = require('express');
const router = express.Router();
const {
  register,
  registerUser,
  superAdminRegister,
  superAdminLogin,
  adminRegister,
  adminLogin,
  login,
  forgotPassword,
  getMe,
  logout,
} = require('../controllers/authController');
const { protect, protectAny } = require('../middleware/auth');

// Super Admin Auth Routes
router.post('/superadmin/register', superAdminRegister || register);
router.post('/superadmin/login', superAdminLogin);

// Admin Auth Routes
router.post('/admin/register', adminRegister || registerUser);
router.post('/admin/login', adminLogin);

// Legacy / General Auth Routes
router.post('/register', register);
router.post('/register-user', registerUser);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', protectAny, getMe);
router.post('/logout', protectAny, logout);

module.exports = router;