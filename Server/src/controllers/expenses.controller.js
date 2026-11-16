import { ExpensesService } from '../services/expenses.service.js';
import { getExpensesDashboardData } from '../services/metrics.service.js';

export class ExpensesController {
  static async getExpensesDashboard(req, res, next) {
    try {
      const data = await getExpensesDashboardData(req.query);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createExpense(req, res, next) {
    try {
      const record = await ExpensesService.createExpense(req.body, req.user.email);
      return res.status(201).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async listExpenses(req, res, next) {
    try {
      const data = await ExpensesService.listExpenses(req.query);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getExpense(req, res, next) {
    try {
      const record = await ExpensesService.getExpense(req.params.id);
      return res.status(200).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async updateExpense(req, res, next) {
    try {
      const record = await ExpensesService.updateExpense(req.params.id, req.body, req.user.email);
      return res.status(200).json({ record });
    } catch (err) {
      next(err);
    }
  }

  static async deleteExpense(req, res, next) {
    try {
      const result = await ExpensesService.deleteExpense(req.params.id, req.user.email);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default ExpensesController;
