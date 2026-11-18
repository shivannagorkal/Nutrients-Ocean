import { Router } from 'express';
import { CustomerAuthController } from '../controllers/customerAuth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { customerRegisterSchema, customerLoginSchema } from '../validations/customerAuth.validation.js';
import { customerAuthenticate } from '../middlewares/customerAuth.middleware.js';

const router = Router();

// Public customer registration (first time)
router.post('/register', validate(customerRegisterSchema), CustomerAuthController.register);

// Public customer login (subsequent visits)
router.post('/login', validate(customerLoginSchema), CustomerAuthController.login);

// Protected customer profile
router.get('/me', customerAuthenticate, CustomerAuthController.getMe);

export default router;
