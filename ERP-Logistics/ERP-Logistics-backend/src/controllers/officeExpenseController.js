const OfficeExpense = require('../models/OfficeExpense');

function dateRangeQuery(from, to) {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return range;
}

/* ── CRUD ─────────────────────────────────────────────────────────────── */

exports.getExpenses = async (req, res) => {
  try {
    const { category, department, from, to } = req.query;
    const q = {};
    if (category) q.category = category;
    if (department) q.department = department;
    const range = dateRangeQuery(from, to);
    if (range) q.date = range;
    res.json(await OfficeExpense.find(q).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createExpense = async (req, res) => {
  try {
    const { category, department, amount, date, paidTo, notes } = req.body;
    const expense = await OfficeExpense.create({
      category, department: department || '', amount: Number(amount) || 0,
      date: date || Date.now(), paidTo: paidTo || '', notes: notes || '',
    });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateExpense = async (req, res) => {
  try {
    const update = {};
    ['category', 'department', 'date', 'paidTo', 'notes'].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    if (req.body.amount !== undefined) update.amount = Number(req.body.amount) || 0;
    const expense = await OfficeExpense.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteExpense = async (req, res) => {
  try {
    await OfficeExpense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Reports ──────────────────────────────────────────────────────────── */

exports.getMonthlyReport = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const expenses = await OfficeExpense.find({
      date: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59`) },
    });
    const byMonth = Array.from({ length: 12 }, () => 0);
    expenses.forEach((e) => { byMonth[new Date(e.date).getMonth()] += e.amount; });
    res.json({
      year,
      byMonth: byMonth.map((a) => parseFloat(a.toFixed(2))),
      total: parseFloat(byMonth.reduce((a, b) => a + b, 0).toFixed(2)),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getYearlyReport = async (_req, res) => {
  try {
    const expenses = await OfficeExpense.find();
    const byYear = {};
    expenses.forEach((e) => {
      const y = new Date(e.date).getFullYear();
      byYear[y] = (byYear[y] || 0) + e.amount;
    });
    const rows = Object.entries(byYear)
      .sort((a, b) => a[0] - b[0])
      .map(([year, total]) => ({ year: Number(year), total: parseFloat(total.toFixed(2)) }));
    res.json({ rows, grandTotal: parseFloat(rows.reduce((a, r) => a + r.total, 0).toFixed(2)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getDepartmentReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = {};
    const range = dateRangeQuery(from, to);
    if (range) q.date = range;
    const expenses = await OfficeExpense.find(q);
    const byDept = {};
    expenses.forEach((e) => {
      const dept = e.department || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + e.amount;
    });
    const rows = Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .map(([department, total]) => ({ department, total: parseFloat(total.toFixed(2)) }));
    res.json({ rows, grandTotal: parseFloat(rows.reduce((a, r) => a + r.total, 0).toFixed(2)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
