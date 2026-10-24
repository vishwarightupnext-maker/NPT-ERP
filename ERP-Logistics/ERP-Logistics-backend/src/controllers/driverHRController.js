const Driver            = require('../models/Driver');
const DriverAttendance   = require('../models/DriverAttendance');
const DriverLeave        = require('../models/DriverLeave');
const DriverPayslip      = require('../models/DriverPayslip');
const DriverPerformance  = require('../models/DriverPerformance');
const Dispatch           = require('../models/Dispatch');

function calcHours(ci, co) {
  if (!ci || !co) return 0;
  const [ih, im] = ci.split(':').map(Number);
  const [oh, om] = co.split(':').map(Number);
  return Math.max(0, parseFloat(((oh * 60 + om - ih * 60 - im) / 60).toFixed(2)));
}

/* ════════════════════════════════════════
 * ATTENDANCE
 * ════════════════════════════════════════ */
exports.getDriverAttendance = async (req, res) => {
  try {
    const { driverId, date, from, to } = req.query;
    const q = {};
    if (driverId) q.driver = driverId;
    if (date) q.date = date;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to) q.date.$lte = to; 
    }
    res.json(await DriverAttendance.find(q).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.upsertDriverAttendance = async (req, res) => {
  try {
    const { driver: driverId, date, status, clockIn, clockOut, notes, tripAttendance } = req.body;
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const ci = status !== 'Absent' && status !== 'On Leave' ? (clockIn || '') : '';
    const co = status !== 'Absent' && status !== 'On Leave' ? (clockOut || '') : '';
    const hoursWorked = calcHours(ci, co);

    const record = await DriverAttendance.findOneAndUpdate(
      { driver: driverId, date },
      {
        driver: driverId, date, driverCode: driver.driverCode, driverName: driver.name,
        status: status || 'Present', clockIn: ci, clockOut: co, hoursWorked,
        tripAttendance: !!tripAttendance, notes: notes || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteDriverAttendanceEntry = async (req, res) => {
  try {
    await DriverAttendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getDriverAttendanceSummary = async (req, res) => {
  try {
    const { driverId, month, year } = req.query;
    if (!driverId || !month || !year) return res.status(400).json({ message: 'driverId, month, year required' });
    const pad = String(month).padStart(2, '0');
    const records = await DriverAttendance.find({
      driver: driverId, date: { $gte: `${year}-${pad}-01`, $lte: `${year}-${pad}-31` },
    }).sort({ date: 1 });

    const presentDays = records.filter(r => r.status === 'Present').length;
    const halfDays     = records.filter(r => r.status === 'Half Day').length;
    const absentDays   = records.filter(r => r.status === 'Absent').length;
    const leaveDays    = records.filter(r => r.status === 'On Leave').length;
    const totalHours   = parseFloat(records.reduce((a, r) => a + (r.hoursWorked || 0), 0).toFixed(2));
    res.json({ presentDays, halfDays, absentDays, leaveDays, totalHours, records });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * LEAVE
 * ════════════════════════════════════════ */
exports.getDriverLeaves = async (req, res) => {
  try {
    const { status, driverId } = req.query;
    const q = {};
    if (status) q.status = status;
    if (driverId) q.driver = driverId;
    res.json(await DriverLeave.find(q).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

async function createLeaveForDriver(driver, body, res) {
  const { leaveType, fromDate, toDate, reason } = body;
  const days = Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / 864e5) + 1);
  const leave = await DriverLeave.create({
    driver: driver._id, driverName: driver.name, driverCode: driver.driverCode,
    leaveType, fromDate, toDate, days, reason,
  });
  res.status(201).json(leave);
}

exports.createDriverLeave = async (req, res) => {
  try {
    const driver = await Driver.findById(req.body.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    await createLeaveForDriver(driver, req.body, res);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateDriverLeaveStatus = async (req, res) => {
  try {
    const leave = await DriverLeave.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * SALARY / PAYSLIPS
 * ════════════════════════════════════════ */
exports.getDriverPayslips = async (req, res) => {
  try {
    const { driverId, month, year } = req.query;
    const q = {};
    if (driverId) q.driver = driverId;
    if (month) q.month = Number(month);
    if (year) q.year = Number(year);
    res.json(await DriverPayslip.find(q).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.generateDriverPayslip = async (req, res) => {
  try {
    const {
      driverId, month, year, monthlySalary, perTripRate,
      incentives, overtimeHours, overtimeRate, advanceSalary, deductions,
    } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const pad = String(month).padStart(2, '0');
    const tripCount = await Dispatch.countDocuments({
      driver: driver.name, status: 'Delivered',
      scheduledDate: { $gte: new Date(`${year}-${pad}-01`), $lt: new Date(Number(year), Number(month), 1) },
    });

    const perTripPayment = tripCount * (Number(perTripRate) || 0);
    const overtimeAmount = (Number(overtimeHours) || 0) * (Number(overtimeRate) || 0);
    const gross = (Number(monthlySalary) || 0) + perTripPayment + (Number(incentives) || 0) + overtimeAmount;
    const totalDeductions = (Number(advanceSalary) || 0) + (Number(deductions) || 0);

    const payslip = await DriverPayslip.findOneAndUpdate(
      { driver: driverId, month: Number(month), year: Number(year) },
      {
        driver: driverId, driverName: driver.name, driverCode: driver.driverCode,
        month: Number(month), year: Number(year),
        monthlySalary: Number(monthlySalary) || 0, tripCount, perTripRate: Number(perTripRate) || 0, perTripPayment,
        incentives: Number(incentives) || 0,
        overtimeHours: Number(overtimeHours) || 0, overtimeRate: Number(overtimeRate) || 0, overtimeAmount,
        advanceSalary: Number(advanceSalary) || 0, deductions: Number(deductions) || 0, totalDeductions,
        grossSalary: gross, netSalary: gross - totalDeductions,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(payslip);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateDriverPayslipStatus = async (req, res) => {
  try {
    const update = { status: req.body.status };
    if (req.body.status === 'Paid') update.paidAt = new Date();
    const payslip = await DriverPayslip.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    res.json(payslip);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * PERFORMANCE
 * ════════════════════════════════════════ */
async function computeDerivedPerformance(driver) {
  const trips = await Dispatch.find({ driver: driver.name });
  const delivered = trips.filter(t => t.status === 'Delivered');
  const totalTrips = delivered.length;
  const totalDistance = parseFloat(delivered.reduce((a, t) => a + (t.distance || 0), 0).toFixed(1));
  const onTimeCount = delivered.filter(t => {
    if (!t.deliveredAt) return false;
    const dueEnd = new Date(t.scheduledDate);
    dueEnd.setHours(23, 59, 59, 999);
    return new Date(t.deliveredAt) <= dueEnd;
  }).length;
  const onTimePercent = totalTrips ? Math.round((onTimeCount / totalTrips) * 100) : null;
  const ratedTrips = trips.filter(t => t.rating);
  const avgTripRating = ratedTrips.length
    ? parseFloat((ratedTrips.reduce((a, t) => a + t.rating, 0) / ratedTrips.length).toFixed(1))
    : null;
  return { totalTrips, totalDistance, onTimePercent, avgTripRating, ratedTripsCount: ratedTrips.length };
}

async function loadOrCreatePerformanceDoc(driverId) {
  return DriverPerformance.findOneAndUpdate(
    { driver: driverId },
    { $setOnInsert: { driver: driverId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

exports.getDriverPerformance = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    const [derived, perf] = await Promise.all([
      computeDerivedPerformance(driver),
      loadOrCreatePerformanceDoc(driver._id),
    ]);
    res.json({ ...derived, rewardPoints: perf.rewardPoints, incidents: perf.incidents, penalties: perf.penalties, ratings: perf.ratings });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addDriverIncident = async (req, res) => {
  try {
    const { description, severity } = req.body;
    const perf = await loadOrCreatePerformanceDoc(req.params.driverId);
    perf.incidents.push({ description, severity: severity || 'Minor' });
    await perf.save();
    res.status(201).json(perf);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addDriverPenalty = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const perf = await loadOrCreatePerformanceDoc(req.params.driverId);
    perf.penalties.push({ amount: Number(amount) || 0, reason });
    await perf.save();
    res.status(201).json(perf);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addDriverRating = async (req, res) => {
  try {
    const { rating, tripNo, comment } = req.body;
    const perf = await loadOrCreatePerformanceDoc(req.params.driverId);
    perf.ratings.push({ rating: Number(rating), tripNo, comment });
    await perf.save();
    res.status(201).json(perf);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.adjustDriverRewardPoints = async (req, res) => {
  try {
    const { delta } = req.body;
    const perf = await loadOrCreatePerformanceDoc(req.params.driverId);
    perf.rewardPoints = Math.max(0, perf.rewardPoints + (Number(delta) || 0));
    await perf.save();
    res.json(perf);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
