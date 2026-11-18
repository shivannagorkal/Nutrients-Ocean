import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export function customerAuthenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.customerAccessToken) {
      token = req.cookies.customerAccessToken;
    }

    if (!token) {
      throw new AppError('Customer authentication required', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired customer session', 401, 'INVALID_SESSION');
    }

    if (decoded.role !== 'customer' || !decoded.customerId) {
      throw new AppError('Invalid customer token', 403, 'FORBIDDEN');
    }

    req.customer = {
      id: decoded.customerId,
      phone: decoded.phone,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export default customerAuthenticate;
