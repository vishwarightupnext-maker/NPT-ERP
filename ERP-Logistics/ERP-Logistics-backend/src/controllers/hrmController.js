const jwt        = require('jsonwebtoken');
const Employee   = require('../models/Employee');
const User       = require('../models/User');
const SuperAdmin = require('../models/SuperAdmin');
const Leave      = require('../models/Leave');
const Payslip    = require('../models/Payslip');
const Attendance = require('../models/Attendance');
const Project    = require('../models/Project');
const DailyPay   = require('../models/DailyPay');

const signHRMToken = (id) =>
  jwt.sign({ id, userType: 'hrm' }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ── HRM Auth ─────────────────────────────────────────────────────────────── */
exports.hrmRegister = async (req, res) => {
  try {
    const { name, email, password, hrmRole } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    const exists = await Employee.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const emp = await Employee.create({ name, email, password, hrmRole: hrmRole || 'Employee' });
    res.status(201).json({ message: 'Registered successfully', employeeId: emp.employeeId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.hrmLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    // 1. Try HRM Employee model
    const emp = await Employee.findOne({ email }).select('+password');
    if (emp && emp.password && (await emp.comparePassword(password))) {
      if (['Inactive', 'Terminated'].includes(emp.status))
        return res.status(403).json({ message: 'Your account is inactive. Contact HR.' });
      const token = signHRMToken(emp._id);
      return res.json({
        token,
        employee: {
          id: emp._id, employeeId: emp.employeeId,
          name: emp.name, email: emp.email,
          hrmRole: emp.hrmRole, department: emp.department,
        },
      });
    }

    // 2. Fallback: main ERP User model — all users get the HRM employee dashboard
    const erpUser = await User.findOne({ email, status: 'Active' });
    if (erpUser && (await erpUser.comparePassword(password))) {
      const token = signHRMToken(erpUser._id);
      return res.json({
        token,
        employee: {
          id: erpUser._id,
          employeeId: `ERP-${erpUser._id.toString().slice(-6).toUpperCase()}`,
          name: erpUser.name, email: erpUser.email,
          hrmRole: 'Employee',
          department: 'Management',
        },
      });
    }

    // 3. Fallback: main ERP SuperAdmin model
    const superAdmin = await SuperAdmin.findOne({ email });
    if (superAdmin && (await superAdmin.comparePassword(password))) {
      const token = signHRMToken(superAdmin._id);
      return res.json({
        token,
        employee: {
          id: superAdmin._id,
          employeeId: 'ERP-SA-001',
          name: superAdmin.name, email: superAdmin.email,
          hrmRole: 'superadmin',
          department: 'Management',
        },
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.hrmMe = (req, res) => res.json({ employee: req.employee });

exports.getStats = async (_req, res) => {
  try {
    const now        = new Date();
    const mStart     = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [total, active, newThis, newPrev, pendingLeaves, allEmp] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'Active' }),
      Employee.countDocuments({ joiningDate: { $gte: mStart } }),
      Employee.countDocuments({ joiningDate: { $gte: prevMStart, $lt: mStart } }),
      Leave.countDocuments({ status: 'Pending' }),
      Employee.find({}, 'workFormat department status'),
    ]);

    const workFormat  = { 'On Site': 0, 'Remote': 0, 'Bench': 0 };
    const departments = {};
    allEmp.forEach(e => {
      if (workFormat[e.workFormat] !== undefined) workFormat[e.workFormat]++;
      departments[e.department] = (departments[e.department] || 0) + 1;
    });

    // Leave-type breakdown (last 30 days)
    const recentLeaves = await Leave.find({ createdAt: { $gte: new Date(Date.now() - 30 * 864e5) } });
    const leaveTypes   = {};
    recentLeaves.forEach(l => { leaveTypes[l.leaveType] = (leaveTypes[l.leaveType] || 0) + 1; });

    // Monthly new hires – last 6 months
    const turnover = [];
    for (let i = 5; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const hired = await Employee.countDocuments({ joiningDate: { $gte: s, $lt: e } });
      turnover.push({ month: s.toLocaleString('default', { month: 'short' }), hired });
    }

    // Recent employees (last 5 joined)
    const recentEmployees = await Employee.find().sort({ joiningDate: -1 }).limit(5)
      .select('name department employmentType joiningDate status');

    res.json({
      totalEmployees: total,
      activeEmployees: active,
      newThisMonth: newThis,
      newLastMonth: newPrev,
      pendingLeaves,
      workFormat,
      departments,
      leaveTypes,
      turnover,
      recentEmployees,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * EMPLOYEES
 * ════════════════════════════════════════ */
exports.getEmployees = async (req, res) => {
  try {
    const { dept, status, type, search, includeErp } = req.query;
    const q = {};
    if (dept)   q.department     = dept;
    if (status) q.status         = status;
    if (type)   q.employmentType = type;
    if (search) q.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { email:       { $regex: search, $options: 'i' } },
      { employeeId:  { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
    ];
    const hrmEmployees = await Employee.find(q).sort({ createdAt: -1 });

    if (!includeErp) return res.json(hrmEmployees);

    // Merge in ERP users (for attendance/payslip/leave dropdowns) — honour
    // the same dept/status/type filters used for real Employees above.
    // With no status filter, default to Active only (sensible for pickers).
    const uq = {};
    if (dept) uq.department     = dept;
    if (type) uq.employmentType = type;
    uq.status = status ? (status === 'Active' ? 'Active' : { $ne: 'Active' }) : 'Active';
    if (search) uq.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const erpUsers = await User.find(uq).sort({ createdAt: -1 });
    const hrmEmails = new Set(hrmEmployees.map(e => e.email));
    const mapped = erpUsers
      .filter(u => !hrmEmails.has(u.email))
      .map(mapUserToEmployeeShape);

    res.json([...hrmEmployees, ...mapped]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createEmployee = async (req, res) => {
  try {
    const emp = await Employee.create(req.body);
    res.status(201).json(emp);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ERP `User` documents don't have the full HRM employee schema — this
// projects one into the same shape getEmployees returns for real Employees,
// so the frontend can treat both kinds of rows identically.
function mapUserToEmployeeShape(u) {
  return {
    _id:             u._id,
    employeeId:      `ERP-${u._id.toString().slice(-6).toUpperCase()}`,
    name:            u.name,
    email:           u.email,
    hrmRole:         'Employee',
    department:      u.department || 'Management',
    designation:     u.designation || '',
    employmentType:  u.employmentType || '',
    workFormat:      u.workFormat || '',
    joiningDate:     u.joiningDate || '',
    salary:          u.salary || 0,
    address:         u.address || '',
    aadhaar:         u.aadhaar || '',
    bankAccount:     u.bankAccount || '',
    ifsc:            u.ifsc || '',
    status:          u.status === 'Active' ? 'Active' : 'Inactive',
  };
}

exports.updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (emp) return res.json(emp);

    // Fall back to ERP User — these are merged into the employee list
    // when fetched with includeErp=true (see getEmployees above). Only
    // the HRM profile fields + name/status are editable here; email,
    // password and role stay untouched to avoid breaking their ERP login.
    const {
      name, department, designation, employmentType, workFormat,
      joiningDate, salary, address, aadhaar, bankAccount, ifsc, status,
    } = req.body;
    const update = {
      ...(name            !== undefined && { name }),
      ...(department      !== undefined && { department }),
      ...(designation     !== undefined && { designation }),
      ...(employmentType  !== undefined && { employmentType }),
      ...(workFormat      !== undefined && { workFormat }),
      ...(joiningDate     !== undefined && { joiningDate }),
      ...(salary          !== undefined && { salary: Number(salary) || 0 }),
      ...(address         !== undefined && { address }),
      ...(aadhaar         !== undefined && { aadhaar }),
      ...(bankAccount     !== undefined && { bankAccount }),
      ...(ifsc            !== undefined && { ifsc }),
      ...(status          !== undefined && { status: status === 'Active' ? 'Active' : 'Inactive' }),
    };
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    res.json(mapUserToEmployeeShape(user));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteEmployee = async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * LEAVES
 * ════════════════════════════════════════ */
exports.getLeaves = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const q = {};
    if (status) q.status    = status;
    if (type)   q.leaveType = type;
    if (search) q.employeeName = { $regex: search, $options: 'i' };
    res.json(await Leave.find(q).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createLeave = async (req, res) => {
  try {
    const { employeeId, leaveType, fromDate, toDate, reason } = req.body;
    const emp  = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    const days = Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / 864e5) + 1);
    const leave = await Leave.create({
      employee: employeeId,
      employeeName: emp.name,
      employeeId:   emp.employeeId,
      department:   emp.department,
      leaveType, fromDate, toDate, days, reason,
    });
    res.status(201).json(leave);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteLeave = async (req, res) => {
  try {
    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * PAYSLIPS
 * ════════════════════════════════════════ */
exports.getPayslips = async (req, res) => {
  try {
    const { month, year, empId } = req.query;
    const q = {};
    if (month) q.month    = Number(month);
    if (year)  q.year     = Number(year);
    if (empId) q.employee = empId;
    res.json(await Payslip.find(q).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.generatePayslip = async (req, res) => {
  try {
    const { employeeId, month, year, workingDays, presentDays,
            basicSalary, hra, ta, da, otherAllowances,
            pf, esi, tax, otherDeductions } = req.body;

    let emp = await Employee.findById(employeeId);
    if (!emp) {
      // Fall back to ERP User — these are merged into the employee list
      // when fetched with includeErp=true (see getEmployees above).
      const user = await User.findById(employeeId);
      if (user) {
        emp = {
          name:        user.name,
          employeeId:  `ERP-${user._id.toString().slice(-6).toUpperCase()}`,
          department:  'Management',
          designation: user.role,
        };
      }
    }
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const gross  = (+basicSalary||0) + (+hra||0) + (+ta||0) + (+da||0) + (+otherAllowances||0);
    const totDed = (+pf||0) + (+esi||0) + (+tax||0) + (+otherDeductions||0);

    // One payslip per employee per month/year — re-saving updates the
    // existing record instead of creating a duplicate card.
    const ps = await Payslip.findOneAndUpdate(
      { employee: employeeId, month: Number(month), year: Number(year) },
      {
        employee: employeeId,
        employeeName:    emp.name,
        employeeId:      emp.employeeId,
        department:      emp.department,
        designation:     emp.designation,
        month: Number(month), year: Number(year),
        workingDays: Number(workingDays) || 26,
        presentDays: Number(presentDays) || 26,
        basicSalary: +basicSalary||0, hra: +hra||0, ta: +ta||0,
        da: +da||0, otherAllowances: +otherAllowances||0,
        pf: +pf||0, esi: +esi||0, tax: +tax||0,
        otherDeductions: +otherDeductions||0,
        grossSalary: gross, totalDeductions: totDed, netSalary: gross - totDed,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(ps);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updatePayslipStatus = async (req, res) => {
  try {
    const ps = await Payslip.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!ps) return res.status(404).json({ message: 'Payslip not found' });
    res.json(ps);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deletePayslip = async (req, res) => {
  try {
    await Payslip.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * ATTENDANCE
 * ════════════════════════════════════════ */
exports.clockIn = async (req, res) => {
  try {
    const emp = req.employee;
    const today = new Date().toISOString().split('T')[0];
    const existing = await Attendance.findOne({ employee: emp._id, date: today });
    if (existing && existing.clockIn) return res.status(400).json({ message: 'Already clocked in today' });
    const now = new Date();
    const clockIn = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const record = existing
      ? await Attendance.findByIdAndUpdate(existing._id, { clockIn }, { new: true })
      : await Attendance.create({ employee: emp._id, employeeCode: emp.employeeId, employeeName: emp.name, date: today, clockIn });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.clockOut = async (req, res) => {
  try {
    const emp = req.employee;
    const today = new Date().toISOString().split('T')[0];
    const record = await Attendance.findOne({ employee: emp._id, date: today });
    if (!record || !record.clockIn) return res.status(400).json({ message: 'No clock-in record found for today' });
    if (record.clockOut) return res.status(400).json({ message: 'Already clocked out today' });
    const now = new Date();
    const clockOut = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const [inH, inM] = record.clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    const hoursWorked = parseFloat(((outH * 60 + outM - inH * 60 - inM) / 60).toFixed(2));
    const status = hoursWorked < 4 ? 'Half Day' : 'Present';
    const updated = await Attendance.findByIdAndUpdate(record._id, { clockOut, hoursWorked, status }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAttendance = async (req, res) => {
  try {
    const { empId, date, from, to } = req.query;
    const q = {};
    if (empId) q.employee = empId;
    if (date) q.date = date;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to)   q.date.$lte = to;
    }
    res.json(await Attendance.find(q).sort({ date: -1, createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = { employee: req.employee._id };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to)   q.date.$lte = to;
    }
    res.json(await Attendance.find(q).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const emp = req.employee;
    const record = await Attendance.findOne({ employee: emp._id, date: today });
    res.json(record || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.upsertAttendance = async (req, res) => {
  try {
    const { date, status, clockIn, clockOut, notes } = req.body;
    const empId = req.employee.hrmRole === 'superadmin' ? req.body.employee : req.employee._id;

    // Resolve name/code from HRM Employee, fallback to ERP User
    let empName, empCode;
    const hrmEmp = await Employee.findById(empId);
    if (hrmEmp) {
      empName = hrmEmp.name;
      empCode = hrmEmp.employeeId;
    } else {
      const erpUser = await User.findById(empId);
      if (!erpUser) return res.status(404).json({ message: 'Employee not found' });
      empName = erpUser.name;
      empCode = `ERP-${erpUser._id.toString().slice(-6).toUpperCase()}`;
    }

    let hoursWorked = 0;
    const ci = status !== 'Absent' ? (clockIn || '') : '';
    const co = status !== 'Absent' ? (clockOut || '') : '';
    if (ci && co) {
      const [ih, im] = ci.split(':').map(Number);
      const [oh, om] = co.split(':').map(Number);
      hoursWorked = Math.max(0, parseFloat(((oh * 60 + om - ih * 60 - im) / 60).toFixed(2)));
    }

    const record = await Attendance.findOneAndUpdate(
      { employee: empId, date },
      { employee: empId, date, employeeCode: empCode, employeeName: empName,
        status: status || 'Present', clockIn: ci, clockOut: co, hoursWorked, notes: notes || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteAttendanceEntry = async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { empId, month, year } = req.query;
    if (!empId || !month || !year)
      return res.status(400).json({ message: 'empId, month, year required' });
    const pad = String(month).padStart(2, '0');
    const records = await Attendance.find({
      employee: empId,
      date: { $gte: `${year}-${pad}-01`, $lte: `${year}-${pad}-31` },
    }).sort({ date: 1 });

    const presentDays = records.filter(r => r.status === 'Present').length;
    const halfDays    = records.filter(r => r.status === 'Half Day').length;
    const absentDays  = records.filter(r => r.status === 'Absent').length;
    const totalHours  = parseFloat(records.reduce((a, r) => a + (r.hoursWorked || 0), 0).toFixed(2));
    res.json({ presentDays, halfDays, absentDays, totalHours, records });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * DAILY PAY
 * ════════════════════════════════════════ */
exports.getDailyPay = async (req, res) => {
  try {
    const { empId, month, year } = req.query;
    const q = {};
    if (empId) q.employee = empId;
    if (month) q.month = Number(month);
    if (year)  q.year  = Number(year);
    res.json(await DailyPay.find(q).sort({ date: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* Employee fetches their own daily-pay entries (all months) */
exports.getMyDailyPay = async (req, res) => {
  try {
    const empId = req.employee._id;
    const { month, year } = req.query;
    const q = { employee: empId };
    if (month) q.month = Number(month);
    if (year)  q.year  = Number(year);
    res.json(await DailyPay.find(q).sort({ year: -1, month: -1, date: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.upsertDailyPay = async (req, res) => {
  try {
    const { employee, date, status, dailyRate, notes } = req.body;
    const emp = await Employee.findById(employee);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const [yearN, monthN] = date.split('-').map(Number);
    const multiplier = status === 'Present' ? 1 : status === 'Half Day' ? 0.5 : 0;
    const rate   = Math.max(0, +dailyRate || 0);
    const amount = parseFloat((rate * multiplier).toFixed(2));

    const entry = await DailyPay.findOneAndUpdate(
      { employee, date },
      { employee, date, month: monthN, year: yearN,
        employeeName: emp.name, employeeCode: emp.employeeId,
        status: status || 'Present', dailyRate: rate, amount,
        notes: notes || '' },
      { upsert: true, new: true }
    );
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteDailyPay = async (req, res) => {
  try {
    await DailyPay.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════
 * PROJECTS
 * ════════════════════════════════════════ */
exports.getProjects = async (req, res) => {
  try {
    const { status } = req.query;
    const q = status ? { status } : {};
    res.json(await Project.find(q).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
