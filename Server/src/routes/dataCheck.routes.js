import { Router } from 'express';
import { DataCheckController } from '../controllers/dataCheck.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', DataCheckController.getDataCheck);

export default router;
