import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { exportSalesCsv, exportExpensesCsv } from '../controllers/export.controller.js';
import { exportQuerySchema } from '../validations/settings.validation.js';

const router = Router();

// All export routes require authentication
router.use(authenticate);

router.get('/sales.csv', validate(exportQuerySchema), exportSalesCsv);
router.get('/expenses.csv', validate(exportQuerySchema), exportExpensesCsv);

export default router;
