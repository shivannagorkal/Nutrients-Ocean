import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP and email
 * Section 11: "5 login attempts per 15 minutes per IP and per email."
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: env.NODE_ENV === 'test' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').trim().toLowerCase();
    return `${ip}:${email}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts, try later',
      },
    });
  },
});

/**
 * General API rate limiter: 100 requests per minute per user/IP
 * Section 11: "100 requests per minute per user elsewhere."
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: env.NODE_ENV === 'test' ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.email || req.ip || 'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, try later',
      },
    });
  },
});

export default {
  loginRateLimiter,
  generalRateLimiter,
};
