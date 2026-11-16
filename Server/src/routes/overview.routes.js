import { Router } from 'express';
import { OverviewController } from '../controllers/overview.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { dashboardRangeQuerySchema } from '../validations/dashboard.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: dashboardRangeQuerySchema }), OverviewController.getOverviewDashboard);

export default router;
