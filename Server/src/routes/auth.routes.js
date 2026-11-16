import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { loginSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/login', loginRateLimiter, validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);

export default router;
