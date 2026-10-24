const TripExpense = require('../models/TripExpense');
const Vehicle     = require('../models/Vehicle');
const Dispatch    = require('../models/Dispatch');
const Invoice     = require('../models/Invoice');

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
    const { vehicleId, category, from, to } = req.query;
    const q = {};
    if (vehicleId) q.vehicle = vehicleId;
    if (category) q.category = category;
    const range = dateRangeQuery(from, to);
    if (range) q.date = range;
    res.json(await TripExpense.find(q).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createExpense = async (req, res) => {
  try {
    const { vehicleId, dispatchNo, driverName, category, amount, liters, odometerKm, date, notes } = req.body;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const expense = await TripExpense.create({
      vehicle: vehicleId,
      registrationNo: vehicle.registrationNo,
      dispatchNo: dispatchNo || '',
      driverName: driverName || '',
      category,
      amount: Number(amount) || 0,
      liters: Number(liters) || 0,
      odometerKm: Number(odometerKm) || 0,
      date: date || Date.now(),
      notes: notes || '',
    });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateExpense = async (req, res) => {
  try {
    const update = {};
    ['category', 'dispatchNo', 'driverName', 'date', 'notes'].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    ['amount', 'liters', 'odometerKm'].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = Number(req.body[k]) || 0;
    });
    const expense = await TripExpense.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteExpense = async (req, res) => {
  try {
    await TripExpense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Reports (all scoped to one selected vehicle) ────────────────────── */

exports.getExpenseSummary = async (req, res) => {
  try {
    const { vehicleId, from, to } = req.query;
    if (!vehicleId) return res.status(400).json({ message: 'vehicleId is required' });

    const q = { vehicle: vehicleId };
    const range = dateRangeQuery(from, to);
    if (range) q.date = range;

    const expenses = await TripExpense.find(q).sort({ date: -1 });
    const byCategory = {};
    let total = 0;
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      total += e.amount;
    });
    res.json({ byCategory, total, count: expenses.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getDieselConsumption = async (req, res) => {
  try {
    const { vehicleId, from, to } = req.query;
    if (!vehicleId) return res.status(400).json({ message: 'vehicleId is required' });
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const q = { vehicle: vehicleId, category: 'Diesel Expense' };
    const range = dateRangeQuery(from, to);
    if (range) q.date = range;
    const entries = await TripExpense.find(q).sort({ date: 1 });

    const totalLiters = parseFloat(entries.reduce((a, e) => a + (e.liters || 0), 0).toFixed(2));
    const totalDieselCost = entries.reduce((a, e) => a + (e.amount || 0), 0);

    const dispatchQ = { vehicle: vehicle.registrationNo, status: 'Delivered' };
    if (from || to) {
      dispatchQ.scheduledDate = {};
      if (from) dispatchQ.scheduledDate.$gte = new Date(from);
      if (to) dispatchQ.scheduledDate.$lte = new Date(to);
    }
    const trips = await Dispatch.find(dispatchQ);
    const totalDistance = parseFloat(trips.reduce((a, t) => a + (t.distance || 0), 0).toFixed(1));

    const avgMileage = totalLiters > 0 ? parseFloat((totalDistance / totalLiters).toFixed(2)) : null;
    const costPerKm  = totalDistance > 0 ? parseFloat((totalDieselCost / totalDistance).toFixed(2)) : null;

    res.json({ totalLiters, totalDieselCost, totalDistance, avgMileage, costPerKm, entries });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const { vehicleId, from, to } = req.query;
    if (!vehicleId) return res.status(400).json({ message: 'vehicleId is required' });
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const expQ = { vehicle: vehicleId };
    const range = dateRangeQuery(from, to);
    if (range) expQ.date = range;
    const expenses = await TripExpense.find(expQ);
    const totalExpense = expenses.reduce((a, e) => a + e.amount, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const invoiceQ = {};
    if (from || to) {
      invoiceQ.invoiceDate = {};
      if (from) invoiceQ.invoiceDate.$gte = new Date(from);
      if (to) invoiceQ.invoiceDate.$lte = new Date(to);
    }
    const invoices = await Invoice.find(invoiceQ).select('rows invoiceDate');
    let totalRevenue = 0;
    invoices.forEach((inv) => {
      inv.rows.forEach((r) => {
        if (r.truckNo === vehicle.registrationNo) totalRevenue += (r.totalAmount || 0);
      });
    });

    res.json({
      registrationNo: vehicle.registrationNo,
      totalRevenue,
      totalExpense,
      profitLoss: totalRevenue - totalExpense,
      expensesByCategory,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
