const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tripExpenseController');
const { protectAny } = require('../middleware/auth');

/* ── Reports ──────────────────────────────────────────────────────────── */
router.get('/summary',            protectAny, ctrl.getExpenseSummary);
router.get('/diesel-consumption', protectAny, ctrl.getDieselConsumption);
router.get('/profit-loss',        protectAny, ctrl.getProfitLoss);

/* ── CRUD ─────────────────────────────────────────────────────────────── */
router.get('/',       protectAny, ctrl.getExpenses);
router.post('/',      protectAny, ctrl.createExpense);
router.patch('/:id',  protectAny, ctrl.updateExpense);
router.delete('/:id', protectAny, ctrl.deleteExpense);

module.exports = router;
