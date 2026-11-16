import { CategoriesService } from '../services/categories.service.js';

export async function listCategories(req, res, next) {
  try {
    const categories = await CategoriesService.listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req, res, next) {
  try {
    const category = await CategoriesService.getCategory(req.params.id);
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await CategoriesService.createCategory(req.body, req.user?.email);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await CategoriesService.updateCategory(req.params.id, req.body, req.user?.email);
    res.json({ category });
  } catch (err) {
    next(err);
  }
}
