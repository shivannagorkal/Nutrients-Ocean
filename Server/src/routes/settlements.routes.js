import { Router } from 'express';
import { SettlementsController } from '../controllers/settlements.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createSettlementSchema,
  updateSettlementSchema,
  getSettlementParamsSchema,
} from '../validations/settlements.validation.js';

const router = Router();

// All settlements routes require authentication
router.use(authenticate);

router.get('/', SettlementsController.listSettlements);
router.post('/', validate(createSettlementSchema), SettlementsController.createSettlement);
router.get('/:id', validate(getSettlementParamsSchema), SettlementsController.getSettlement);
router.put('/:id', validate(updateSettlementSchema), SettlementsController.updateSettlement);
router.delete('/:id', validate(getSettlementParamsSchema), SettlementsController.deleteSettlement);

export default router;
