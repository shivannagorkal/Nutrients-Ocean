import { Router } from 'express';
import authRoutes from './auth.routes.js';
import metaRoutes from './meta.routes.js';
import todayRoutes from './today.routes.js';
import overviewRoutes from './overview.routes.js';
import partnersRoutes from './partners.routes.js';
import dataCheckRoutes from './dataCheck.routes.js';
import salesRoutes from './sales.routes.js';
import expensesRoutes from './expenses.routes.js';
import settlementsRoutes from './settlements.routes.js';
import productsRoutes from './products.routes.js';
import categoriesRoutes from './categories.routes.js';
import exportRoutes from './export.routes.js';
import { generalRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Apply general rate limiter (100 req/min) across API per Section 11
router.use(generalRateLimiter);

// Auth routes (/api/auth)
router.use('/auth', authRoutes);

// Meta reference routes (/api/meta)
router.use('/meta', metaRoutes);

// Dashboard read routes per Section 8
router.use('/today', todayRoutes);
router.use('/overview', overviewRoutes);
router.use('/partners', partnersRoutes);
router.use('/data-check', dataCheckRoutes);

// Core CRUD routes per Section 8
router.use('/sales', salesRoutes);
router.use('/expenses', expensesRoutes);
router.use('/settlements', settlementsRoutes);

// Settings and Export routes per Section 8
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/export', exportRoutes);

export default router;
