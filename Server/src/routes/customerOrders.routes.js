import { Router } from 'express';
import * as customerOrderController from '../controllers/customerOrder.controller.js';
import { customerAuthenticate } from '../middlewares/customerAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema } from '../validations/customerOrder.validation.js';

const router = Router();

// All customer order routes require customer authentication
router.use(customerAuthenticate);

router.post('/', validate(createOrderSchema), customerOrderController.createOrder);
router.get('/', customerOrderController.getCustomerOrders);
router.get('/:id', customerOrderController.getCustomerOrderById);

export default router;
