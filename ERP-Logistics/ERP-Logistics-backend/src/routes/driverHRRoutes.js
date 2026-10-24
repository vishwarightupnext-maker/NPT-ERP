const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/driverHRController');
const { protectAny } = require('../middleware/auth');

/* ── Attendance ───────────────────────────────────────────────────────────── */
router.get('/attendance',            protectAny, ctrl.getDriverAttendance);
router.post('/attendance/entry',     protectAny, ctrl.upsertDriverAttendance);
router.get('/attendance/summary',    protectAny, ctrl.getDriverAttendanceSummary);
router.delete('/attendance/:id',     protectAny, ctrl.deleteDriverAttendanceEntry);

/* ── Leave ────────────────────────────────────────────────────────────────── */
router.get('/leaves',              protectAny, ctrl.getDriverLeaves);
router.post('/leaves',             protectAny, ctrl.createDriverLeave);
router.patch('/leaves/:id/status', protectAny, ctrl.updateDriverLeaveStatus);

/* ── Salary / Payslips ────────────────────────────────────────────────────── */
router.get('/payslips',              protectAny, ctrl.getDriverPayslips);
router.post('/payslips',             protectAny, ctrl.generateDriverPayslip);
router.patch('/payslips/:id/status', protectAny, ctrl.updateDriverPayslipStatus);

/* ── Performance ──────────────────────────────────────────────────────────── */
router.get('/performance/:driverId',                    protectAny, ctrl.getDriverPerformance);
router.post('/performance/:driverId/incidents',         protectAny, ctrl.addDriverIncident);
router.post('/performance/:driverId/penalties',         protectAny, ctrl.addDriverPenalty);
router.post('/performance/:driverId/ratings',           protectAny, ctrl.addDriverRating);
router.patch('/performance/:driverId/reward-points',    protectAny, ctrl.adjustDriverRewardPoints);

module.exports = router;
