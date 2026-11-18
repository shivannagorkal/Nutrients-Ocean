import { Router } from 'express';
import * as customerOrderController from '../controllers/customerOrder.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateOrderStatusSchema } from '../validations/customerOrder.validation.js';

const router = Router();

// All admin order routes require admin authentication
router.use(authenticate);

router.get('/', customerOrderController.getAdminOrders);
router.patch('/:id/status', validate(updateOrderStatusSchema), customerOrderController.updateOrderStatus);

export default router;
