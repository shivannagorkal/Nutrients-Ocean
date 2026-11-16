import { SalesService } from '../services/sales.service.js';
import { getSalesDashboardData } from '../services/metrics.service.js';

export class SalesController {
  static async getSalesDashboard(req, res, next) {
    try {
      const data = await getSalesDashboardData(req.query);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createSale(req, res, next) {
    try {
      const record = await SalesService.createSale(req.body, req.user.email);
      return res.status(201).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async listSales(req, res, next) {
    try {
      const data = await SalesService.listSales(req.query);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getSale(req, res, next) {
    try {
      const record = await SalesService.getSale(req.params.id);
      return res.status(200).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async updateSale(req, res, next) {
    try {
      const record = await SalesService.updateSale(req.params.id, req.body, req.user.email);
      return res.status(200).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSale(req, res, next) {
    try {
      const result = await SalesService.deleteSale(req.params.id, req.user.email);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default SalesController;
