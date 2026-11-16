import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { recordAudit } from './audit.service.js';

// Pre-computed bcrypt hash of a random string for constant-time dummy compare
const DUMMY_HASH = '$2a$10$wT8Kz0t5v8n0W9QYd1aFvefPz2mC9W5gV6jL0rG7tK1yO3p4b5a6c';

export class AuthService {
  /**
   * Authenticate user against env.ALLOWED_USERS with constant-time dummy comparison
   * @param {string} email
   * @param {string} password
   */
  static async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    const allowedUsers = env.ALLOWED_USERS || [];
    const matchedUser = allowedUsers.find(
      (u) => (u.email || '').trim().toLowerCase() === cleanEmail
    );

    if (!matchedUser) {
      // Run dummy compare to mitigate timing-based user enumeration attacks
      await bcrypt.compare(cleanPassword, DUMMY_HASH);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(cleanPassword, matchedUser.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate signed JWT for session cookie (7 days expiry per Section 11)
    const token = jwt.sign(
      {
        email: matchedUser.email,
        member: matchedUser.member,
      },
      env.JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    // Record login in audit log
    await recordAudit({
      userEmail: matchedUser.email,
      action: 'login',
      entity: 'auth',
      entityId: matchedUser.email,
      after: { email: matchedUser.email, member: matchedUser.member },
    });

    return {
      token,
      user: {
        email: matchedUser.email,
        member: matchedUser.member,
      },
    };
  }

  /**
   * Record logout in audit log
   * @param {string} email
   */
  static async logout(email) {
    if (email) {
      await recordAudit({
        userEmail: email,
        action: 'logout',
        entity: 'auth',
        entityId: email,
      });
    }
  }
}

export default AuthService;
