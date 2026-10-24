const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/officeExpenseController');
const { protect } = require('../middleware/auth');

// Office Expense Module is a Super Admin-only module.
router.get('/reports/monthly',    protect, ctrl.getMonthlyReport);
router.get('/reports/yearly',     protect, ctrl.getYearlyReport);
router.get('/reports/department', protect, ctrl.getDepartmentReport);

router.get('/',       protect, ctrl.getExpenses);
router.post('/',      protect, ctrl.createExpense);
router.patch('/:id',  protect, ctrl.updateExpense);
router.delete('/:id', protect, ctrl.deleteExpense);

module.exports = router;
