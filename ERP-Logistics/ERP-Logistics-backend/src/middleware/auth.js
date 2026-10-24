const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const User       = require('../models/User');
const Employee   = require('../models/Employee');

// Hardcoded static superadmin identity used when token === 'superadmin-static'
const STATIC_SA = { _id: 'superadmin-static', name: 'Superadmin', email: 'superadmin@gmail.com', role: 'superadmin' };

// SuperAdmin-only routes (existing behaviour unchanged)
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized' });
  const token = header.split(' ')[1];
  if (token === 'superadmin-static') { req.user = STATIC_SA; return next(); }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await SuperAdmin.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin/User-model routes
const protectUser = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized' });
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'user')
      return res.status(403).json({ message: 'Access denied' });
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || req.user.status !== 'Active')
      return res.status(401).json({ message: 'User not found or inactive' });
    req.userType = 'user';
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Works for both SuperAdmin and User tokens (used by shared endpoints like logout)
const protectAny = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized' });
  const token = header.split(' ')[1];
  if (token === 'superadmin-static') { req.user = STATIC_SA; req.userType = 'superadmin'; return next(); }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType === 'user') {
      req.user = await User.findById(decoded.id).select('-password');
      req.userType = 'user';
    } else {
      req.user = await SuperAdmin.findById(decoded.id).select('-password');
      req.userType = 'superadmin';
    }
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// HRM-portal-only routes
const STATIC_HRM_SA = { _id: 'hrm-superadmin-static', name: 'HRM Superadmin', email: 'hrmsuperadmin@gmail.com', hrmRole: 'superadmin', employeeId: 'HRM-SA-001', department: 'Human Resources' };

const protectHRM = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized' });
  const tok = header.split(' ')[1];
  if (tok === 'hrm-superadmin-static') { req.employee = STATIC_HRM_SA; return next(); }
  try {
    const decoded = jwt.verify(tok, process.env.JWT_SECRET);
    if (decoded.userType !== 'hrm')
      return res.status(403).json({ message: 'Access denied — HRM token required' });

    // 1. Try HRM Employee model
    req.employee = await Employee.findById(decoded.id).select('-password');

    // 2. Fallback: ERP User model — all users get employee-level HRM access
    if (!req.employee) {
      const erpUser = await User.findById(decoded.id).select('-password');
      if (erpUser && erpUser.status === 'Active') {
        req.employee = {
          _id: erpUser._id,
          employeeId: `ERP-${erpUser._id.toString().slice(-6).toUpperCase()}`,
          name: erpUser.name,
          email: erpUser.email,
          hrmRole: 'Employee',
          department: 'Management',
        };
      }
    }

    // 3. Fallback: ERP SuperAdmin model
    if (!req.employee) {
      const sa = await SuperAdmin.findById(decoded.id);
      if (sa) {
        req.employee = {
          _id: sa._id,
          employeeId: 'ERP-SA-001',
          name: sa.name,
          email: sa.email,
          hrmRole: 'superadmin',
          department: 'Management',
        };
      }
    }

    if (!req.employee) return res.status(401).json({ message: 'Employee not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { protect, protectUser, protectAny, protectHRM };
