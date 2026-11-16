import { Router } from 'express';
import { getTodayDashboard } from '../controllers/today.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { todayQuerySchema } from '../validations/today.validation.js';

const router = Router();

// Dashboard reads require authentication per Section 8
router.use(authenticate);

router.get('/', validate({ query: todayQuerySchema }), getTodayDashboard);

export default router;
