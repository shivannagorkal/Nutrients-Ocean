import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createSaleSchema,
  createSaleOrderSchema,
  updateSaleSchema,
  getSaleParamsSchema,
  listSalesQuerySchema,
} from '../validations/sales.validation.js';
import { dashboardRangeQuerySchema } from '../validations/dashboard.validation.js';

const router = Router();

// All sales routes require authentication per Section 8
router.use(authenticate);

// Dashboard aggregates per Section 8: GET /api/sales?from=&to=&group=
router.get('/', validate({ query: dashboardRangeQuerySchema }), SalesController.getSalesDashboard);

// Static records routes registered first per Section 8
router.get('/records', validate(listSalesQuerySchema), SalesController.listSales);
router.post('/records', validate(createSaleSchema), SalesController.createSale);
router.post('/order', validate(createSaleOrderSchema), SalesController.createSaleOrder);

// ID-based records routes registered after
router.get('/records/:id', validate(getSaleParamsSchema), SalesController.getSale);
router.put('/records/:id', validate(updateSaleSchema), SalesController.updateSale);
router.delete('/records/:id', validate(getSaleParamsSchema), SalesController.deleteSale);

export default router;
