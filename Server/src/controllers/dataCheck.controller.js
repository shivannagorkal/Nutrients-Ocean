import { DataCheckService } from '../services/dataCheck.service.js';

export class DataCheckController {
  static async getDataCheck(req, res, next) {
    try {
      const data = await DataCheckService.runAllChecks();
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

export default DataCheckController;
