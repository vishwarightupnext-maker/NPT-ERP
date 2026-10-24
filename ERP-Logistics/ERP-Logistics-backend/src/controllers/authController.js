const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const SuperAdmin = require('../models/SuperAdmin');
const User = require('../models/User');
const redis = require('../config/redis');

const signToken = (id, userType = null) => {
  const payload = userType ? { id, userType } : { id };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* Admin Registration (Auto-Approved) */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const superExists = await SuperAdmin.findOne({ email });
    if (superExists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Admin',
      status: 'Active', // Auto approved
    });

    const token = signToken(user._id, 'user');
    await redis.set(`session:user:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      message: 'Admin account created successfully.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Dedicated Admin Registration Endpoint */
exports.adminRegister = exports.registerUser;

/* Dedicated Super Admin Registration Endpoint */
exports.register = exports.superAdminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const exists = await SuperAdmin.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Super Admin email already registered' });

    const user = await SuperAdmin.create({ name, email, password });
    const token = signToken(user._id);

    await redis.set(`session:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);

    // Sync into User collection so this account appears in User Management
    const userExists = await User.findOne({ email });
    if (!userExists) {
      await User.create({ name, email, password, role: 'Admin', status: 'Active' });
    }

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      message: 'Super Admin account created successfully.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Dedicated Super Admin Login */
exports.superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });
    if (!superAdmin) {
      return res.status(404).json({ message: 'No Super Admin account found with this email.' });
    }

    if (!(await superAdmin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    const token = signToken(superAdmin._id);
    await redis.set(`session:${superAdmin._id}`, token, 'EX', 60 * 60 * 24 * 7);

    return res.json({
      token,
      user: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email, role: superAdmin.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Dedicated Admin Login */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No Admin account found with this email. Please register first.' });
    }

    // Auto approve if user status was pending
    if (user.status === 'Pending') {
      user.status = 'Active';
      await user.save();
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    const token = signToken(user._id, 'user');
    await redis.set(`session:user:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Combined Login (fallback for legacy login routes) */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    // ── Try SuperAdmin first ──────────────────────────────────────────
    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });
    if (superAdmin) {
      if (!(await superAdmin.comparePassword(password)))
        return res.status(401).json({ message: 'Invalid password. Please try again.' });

      const token = signToken(superAdmin._id);
      await redis.set(`session:${superAdmin._id}`, token, 'EX', 60 * 60 * 24 * 7);

      const userExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (!userExists) {
        const tmp = crypto.randomBytes(24).toString('hex');
        await User.create({ name: superAdmin.name, email: email.toLowerCase().trim(), password: tmp, role: 'Admin', status: 'Active' });
      }

      return res.json({
        token,
        user: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email, role: superAdmin.role },
      });
    }

    // ── Try regular User ──────────────────────────────────────────────
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email. Please sign up first.' });
    }

    // Auto-approve pending accounts
    if (user.status === 'Pending') {
      user.status = 'Active';
      await user.save();
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }

    if (user.role === 'Driver') {
      return res.status(403).json({ message: 'Driver accounts do not have portal access. Contact your administrator.' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    const token = signToken(user._id, 'user');
    await redis.set(`session:user:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await SuperAdmin.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    const newPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();

    user.password = newPassword;
    await user.save();

    await transporter.sendMail({
      from: `"ERP Logistics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your New Password — ERP Logistics',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:8px;">
          <h2 style="color:#1d4ed8;">ERP Logistics</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your password has been reset. Use the temporary password below to log in, then change it immediately.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;font-size:20px;font-weight:bold;letter-spacing:2px;color:#1e40af;text-align:center;">
            ${newPassword}
          </div>
          <p style="margin-top:24px;color:#64748b;font-size:13px;">If you did not request this, please contact support immediately.</p>
        </div>
      `,
    });

    res.json({ message: 'A new password has been sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

exports.logout = async (req, res) => {
  const key = req.userType === 'user'
    ? `session:user:${req.user._id}`
    : `session:${req.user._id}`;
  await redis.del(key);
  res.json({ message: 'Logged out' });
};
