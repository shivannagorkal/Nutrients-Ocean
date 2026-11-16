import { SettlementsService } from '../services/settlements.service.js';

export class SettlementsController {
  static async createSettlement(req, res, next) {
    try {
      const record = await SettlementsService.createSettlement(req.body, req.user.email);
      return res.status(201).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async listSettlements(req, res, next) {
    try {
      const data = await SettlementsService.listSettlements();
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getSettlement(req, res, next) {
    try {
      const record = await SettlementsService.getSettlement(req.params.id);
      return res.status(200).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettlement(req, res, next) {
    try {
      const record = await SettlementsService.updateSettlement(req.params.id, req.body, req.user.email);
      return res.status(200).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSettlement(req, res, next) {
    try {
      const result = await SettlementsService.deleteSettlement(req.params.id, req.user.email);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default SettlementsController;
