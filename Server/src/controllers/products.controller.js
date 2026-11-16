import { ProductsService } from '../services/products.service.js';

export async function listProducts(req, res, next) {
  try {
    const products = await ProductsService.listProducts();
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await ProductsService.getProduct(req.params.id);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await ProductsService.createProduct(req.body, req.user?.email);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await ProductsService.updateProduct(req.params.id, req.body, req.user?.email);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}
