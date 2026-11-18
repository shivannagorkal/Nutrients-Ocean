import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

// Pre-computed bcrypt hash of a random string for constant-time dummy compare
const DUMMY_HASH = '$2a$10$wT8Kz0t5v8n0W9QYd1aFvefPz2mC9W5gV6jL0rG7tK1yO3p4b5a6c';

export class CustomerAuthService {
  /**
   * Register a new customer with mobile, name, and password
   * @param {Object} data
   * @param {string} data.phone - 10-digit mobile number
   * @param {string} data.fullName - Customer full name
   * @param {string} data.password - Password meeting complexity requirements
   */
  static async register({ phone, fullName, password }) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanName = (fullName || '').trim();

    // Check if phone number is already registered
    const existing = await query('SELECT id, phone, full_name FROM customers WHERE phone = $1', [cleanPhone]);
    if (existing.rows.length > 0) {
      throw new AppError(
        'This mobile number is already registered. Please sign in with your password.',
        409,
        'ALREADY_REGISTERED'
      );
    }

    // Hash password with bcrypt cost factor 10
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert customer record
    const insertResult = await query(
      `INSERT INTO customers (phone, full_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, phone, full_name, created_at`,
      [cleanPhone, cleanName, passwordHash]
    );

    const customer = insertResult.rows[0];

    // Issue JWT with 30-day validity for mobile customers
    const token = jwt.sign(
      {
        customerId: customer.id,
        phone: customer.phone,
        role: 'customer',
      },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      token,
      customer: {
        id: customer.id,
        phone: customer.phone,
        fullName: customer.full_name,
        createdAt: customer.created_at,
      },
    };
  }

  /**
   * Login customer using mobile number and password
   * @param {Object} data
   * @param {string} data.phone
   * @param {string} data.password
   */
  static async login({ phone, password }) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanPassword = (password || '').trim();

    const res = await query(
      `SELECT id, phone, full_name, password_hash, is_active, created_at
       FROM customers
       WHERE phone = $1`,
      [cleanPhone]
    );

    const customer = res.rows[0];

    if (!customer || !customer.is_active) {
      // Dummy compare to mitigate timing-based enumeration
      await bcrypt.compare(cleanPassword, DUMMY_HASH);
      throw new AppError('Invalid mobile number or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(cleanPassword, customer.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid mobile number or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        customerId: customer.id,
        phone: customer.phone,
        role: 'customer',
      },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      token,
      customer: {
        id: customer.id,
        phone: customer.phone,
        fullName: customer.full_name,
        createdAt: customer.created_at,
      },
    };
  }

  /**
   * Retrieve customer profile by ID
   * @param {string} customerId
   */
  static async getProfile(customerId) {
    const res = await query(
      `SELECT id, phone, full_name, is_active, created_at
       FROM customers
       WHERE id = $1`,
      [customerId]
    );

    const customer = res.rows[0];
    if (!customer || !customer.is_active) {
      throw new AppError('Customer account not found or deactivated', 404, 'CUSTOMER_NOT_FOUND');
    }

    return {
      id: customer.id,
      phone: customer.phone,
      fullName: customer.full_name,
      createdAt: customer.created_at,
    };
  }
}

export default CustomerAuthService;
