import { getOverviewDashboardData } from '../services/metrics.service.js';

export class OverviewController {
  static async getOverviewDashboard(req, res, next) {
    try {
      const data = await getOverviewDashboardData(req.query);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

export default OverviewController;
