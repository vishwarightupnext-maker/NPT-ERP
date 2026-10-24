const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/hrmController');
const { protectHRM } = require('../middleware/auth');

/* ── Public HRM auth ───────────────────────────────────────────────────────── */
router.post('/auth/register', ctrl.hrmRegister);
router.post('/auth/login',    ctrl.hrmLogin);
router.get('/auth/me',        protectHRM, ctrl.hrmMe);

/* ── Protected HRM data ────────────────────────────────────────────────────── */
router.get('/stats', protectHRM, ctrl.getStats);

router.route('/employees')
  .get(protectHRM,  ctrl.getEmployees)
  .post(protectHRM, ctrl.createEmployee);
router.route('/employees/:id')
  .put(protectHRM,    ctrl.updateEmployee)
  .delete(protectHRM, ctrl.deleteEmployee);

router.route('/leaves')
  .get(protectHRM,  ctrl.getLeaves)
  .post(protectHRM, ctrl.createLeave);
router.patch('/leaves/:id/status', protectHRM, ctrl.updateLeaveStatus);
router.delete('/leaves/:id',       protectHRM, ctrl.deleteLeave);

router.route('/payslips')
  .get(protectHRM,  ctrl.getPayslips)
  .post(protectHRM, ctrl.generatePayslip);
router.patch('/payslips/:id/status', protectHRM, ctrl.updatePayslipStatus);
router.delete('/payslips/:id',       protectHRM, ctrl.deletePayslip);

/* ── Attendance ─────────────────────────────────────────────────────────────── */
router.post('/attendance/clock-in',  protectHRM, ctrl.clockIn);
router.post('/attendance/clock-out', protectHRM, ctrl.clockOut);
router.post('/attendance/entry',     protectHRM, ctrl.upsertAttendance);
router.get('/attendance/today',      protectHRM, ctrl.getTodayAttendance);
router.get('/attendance/mine',       protectHRM, ctrl.getMyAttendance);
router.get('/attendance/summary',    protectHRM, ctrl.getAttendanceSummary);
router.get('/attendance',            protectHRM, ctrl.getAttendance);
router.delete('/attendance/:id',     protectHRM, ctrl.deleteAttendanceEntry);

/* ── Daily Pay ──────────────────────────────────────────────────────────────── */
router.get('/daily-pay/mine',    protectHRM, ctrl.getMyDailyPay);
router.get('/daily-pay',         protectHRM, ctrl.getDailyPay);
router.post('/daily-pay',        protectHRM, ctrl.upsertDailyPay);
router.delete('/daily-pay/:id',  protectHRM, ctrl.deleteDailyPay);

/* ── Projects ───────────────────────────────────────────────────────────────── */
router.route('/projects')
  .get(protectHRM,  ctrl.getProjects)
  .post(protectHRM, ctrl.createProject);
router.route('/projects/:id')
  .put(protectHRM,    ctrl.updateProject)
  .delete(protectHRM, ctrl.deleteProject);

module.exports = router;
