import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
} from '../controllers/products.controller.js';
import {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
} from '../validations/settings.validation.js';

const router = Router();

// All product management requires authentication
router.use(authenticate);

router.get('/', listProducts);
router.post('/', validate(createProductSchema), createProduct);
router.get('/:id', validate(getProductSchema), getProduct);
router.put('/:id', validate(updateProductSchema), updateProduct);

export default router;
