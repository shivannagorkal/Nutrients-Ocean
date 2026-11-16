import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
} from '../controllers/categories.controller.js';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategorySchema,
} from '../validations/settings.validation.js';

const router = Router();

// All category management requires authentication
router.use(authenticate);

router.get('/', listCategories);
router.post('/', validate(createCategorySchema), createCategory);
router.get('/:id', validate(getCategorySchema), getCategory);
router.put('/:id', validate(updateCategorySchema), updateCategory);

export default router;
