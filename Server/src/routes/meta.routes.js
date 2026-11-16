import { Router } from 'express';
import { MetaController } from '../controllers/meta.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/meta requires authentication
router.use(authenticate);

router.get('/', MetaController.getMetadata);

export default router;
