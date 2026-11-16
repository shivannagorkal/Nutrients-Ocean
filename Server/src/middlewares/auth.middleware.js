import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export const SESSION_COOKIE_NAME = 'session';

/**
 * Verify JWT session cookie and attach req.user
 */
export function authenticate(req, res, next) {
  try {
    let token = null;

    // Check httpOnly session cookie
    if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
      token = req.cookies[SESSION_COOKIE_NAME];
    }
    // Also support Authorization header for Supertest/API tests
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (e) {
      throw new AppError('Invalid or expired session', 401, 'INVALID_SESSION');
    }

    // Verify user is still in ALLOWED_USERS
    const allowedUsers = env.ALLOWED_USERS || [];
    const matchedUser = allowedUsers.find(
      (u) => (u.email || '').toLowerCase() === (decoded.email || '').toLowerCase()
    );

    if (!matchedUser) {
      throw new AppError('User account not found or access revoked', 401, 'USER_REVOKED');
    }

    req.user = {
      email: matchedUser.email,
      member: matchedUser.member,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * CSRF protection: SameSite=Strict cookie + Origin/Referer check on non-GET requests
 */
export function csrfProtection(req, res, next) {
  // Safe methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt public login route from CSRF check (first request sets the cookie)
  if (req.path === '/api/auth/login' || req.path === '/auth/login') {
    return next();
  }

  const origin = req.headers.origin ? req.headers.origin.replace(/\/$/, '') : null;
  const referer = req.headers.referer;

  // In test environment, skip if neither is set
  if (env.NODE_ENV === 'test' && !origin && !referer) {
    return next();
  }

  const allowedOrigins = (env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  let isValid = false;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    isValid = true;
  } else if (referer && (allowedOrigins.length === 0 || allowedOrigins.some((o) => referer.startsWith(o)) || allowedOrigins.includes('*'))) {
    isValid = true;
  }

  if (!isValid && env.NODE_ENV === 'production') {
    return next(new AppError('Forbidden: Cross-site request rejected', 403, 'CSRF_FORBIDDEN'));
  }

  next();
}

export default {
  authenticate,
  csrfProtection,
  SESSION_COOKIE_NAME,
};
