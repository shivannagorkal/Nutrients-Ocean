import { Router } from 'express';
import { ExpensesController } from '../controllers/expenses.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createExpenseSchema,
  createExpenseBillSchema,
  updateExpenseSchema,
  getExpenseParamsSchema,
  listExpensesQuerySchema,
} from '../validations/expenses.validation.js';
import { dashboardRangeQuerySchema } from '../validations/dashboard.validation.js';

const router = Router();

// All expense routes require authentication per Section 8
router.use(authenticate);

// Dashboard aggregates per Section 8: GET /api/expenses?from=&to=&group=
router.get('/', validate({ query: dashboardRangeQuerySchema }), ExpensesController.getExpensesDashboard);

// Static records routes registered first per Section 8
router.get('/records', validate(listExpensesQuerySchema), ExpensesController.listExpenses);
router.post('/records', validate(createExpenseSchema), ExpensesController.createExpense);
router.post('/bill', validate(createExpenseBillSchema), ExpensesController.createExpenseBill);

// ID-based records routes registered after
router.get('/records/:id', validate(getExpenseParamsSchema), ExpensesController.getExpense);
router.put('/records/:id', validate(updateExpenseSchema), ExpensesController.updateExpense);
router.delete('/records/:id', validate(getExpenseParamsSchema), ExpensesController.deleteExpense);

export default router;
