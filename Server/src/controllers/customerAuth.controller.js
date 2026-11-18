import { CustomerAuthService } from '../services/customerAuth.service.js';

export class CustomerAuthController {
  /**
   * POST /api/customer/auth/register
   */
  static async register(req, res, next) {
    try {
      const result = await CustomerAuthService.register(req.body);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customer/auth/login
   */
  static async login(req, res, next) {
    try {
      const result = await CustomerAuthService.login(req.body);
      return res.status(200).json({
        success: true,
        message: 'Signed in successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/auth/me
   */
  static async getMe(req, res, next) {
    try {
      const profile = await CustomerAuthService.getProfile(req.customer.id);
      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default CustomerAuthController;
