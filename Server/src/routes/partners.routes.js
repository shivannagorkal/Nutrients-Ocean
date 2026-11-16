import { Router } from 'express';
import { PartnersController } from '../controllers/partners.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', PartnersController.getPartnersDashboard);

export default router;
