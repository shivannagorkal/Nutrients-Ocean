import { getTodayDashboardData } from '../services/metrics.service.js';
import { getTodayISTDateString } from '../utils/date.js';

export async function getTodayDashboard(req, res, next) {
  try {
    const targetDate = req.query.date || getTodayISTDateString();
    const data = await getTodayDashboardData(targetDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
