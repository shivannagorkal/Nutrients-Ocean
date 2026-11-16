import { AuthService } from '../services/auth.service.js';
import { env } from '../config/env.js';
import { SESSION_COOKIE_NAME } from '../middlewares/auth.middleware.js';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      // Set httpOnly session cookie with 7-day expiry per Section 11 (strict by default, configurable via COOKIE_SAME_SITE)
      const sameSite = (env.COOKIE_SAME_SITE || 'strict').toLowerCase();
      const isSecure = env.NODE_ENV === 'production' || sameSite === 'none';

      res.cookie(SESSION_COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: isSecure,
        sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.status(200).json({
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req, res, next) {
    try {
      return res.status(200).json({
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      if (req.user?.email) {
        await AuthService.logout(req.user.email);
      }

      const sameSite = (env.COOKIE_SAME_SITE || 'strict').toLowerCase();
      const isSecure = env.NODE_ENV === 'production' || sameSite === 'none';

      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: isSecure,
        sameSite,
        path: '/',
      });

      return res.status(200).json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
