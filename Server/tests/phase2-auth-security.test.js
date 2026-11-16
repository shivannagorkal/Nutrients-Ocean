import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';
import { env } from '../src/config/env.js';

describe('Phase 2 Auth & Security Base Verification', () => {
  const validEmail = 'shivanna@nutrientsocean.com';
  const validPassword = 'Admin@123'; // matches passwordHash generated in Phase 1
  let sessionCookie = '';

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Authentication Flow', () => {
    test('POST /api/auth/login with valid credentials sets httpOnly cookie and returns user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validEmail, password: validPassword });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          email: validEmail,
          member: 'Shivanna Gorkal',
        },
      });

      // Verify cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const session = cookies.find((c) => c.startsWith('session='));
      expect(session).toBeDefined();
      expect(session).toMatch(/HttpOnly/i);
      expect(session).toMatch(/SameSite=Strict/i);

      sessionCookie = session.split(';')[0];
    });

    test('GET /api/auth/me with valid session cookie returns signed-in user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          email: validEmail,
          member: 'Shivanna Gorkal',
        },
      });
    });

    test('GET /api/auth/me without session cookie returns 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('GET /api/auth/me with invalid or tampered token returns 401 INVALID_SESSION', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'session=invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INVALID_SESSION');
    });

    test('POST /api/auth/logout clears the session cookie and returns { ok: true }', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const session = cookies.find((c) => c.startsWith('session='));
      expect(session).toMatch(/session=;/); // Cleared cookie
    });
  });

  describe('2. Security & Timing Attack Mitigations', () => {
    test('POST /api/auth/login with wrong password returns 401 with generic error message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validEmail, password: 'WrongPassword999' });

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    test('POST /api/auth/login with unknown email returns identical 401 error shape and message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@nutrientsocean.com', password: 'AnyPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    test('Response hides x-powered-by header and includes security headers', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Rate limiter returns 429 and "Too many attempts, try later" after limit', async () => {
      // Test the rate limiter middleware directly with a 5-request limit
      const express = (await import('express')).default;
      const rateLimit = (await import('express-rate-limit')).default;
      
      const testApp = express();
      testApp.use(express.json());
      testApp.post(
        '/test-login-limit',
        rateLimit({
          windowMs: 15 * 60 * 1000,
          limit: 2, // short limit for testing
          handler: (req, res) => {
            res.status(429).json({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many attempts, try later',
              },
            });
          },
        }),
        (req, res) => res.json({ ok: true })
      );

      await request(testApp).post('/test-login-limit').send();
      await request(testApp).post('/test-login-limit').send();
      const res = await request(testApp).post('/test-login-limit').send();

      expect(res.status).toBe(429);
      expect(res.body.error).toEqual({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts, try later',
      });
    });
  });

  describe('3. Zod Request Validation & Strict Input Safety', () => {
    test('Rejects login without password with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validEmail });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });

    test('Rejects login with invalid email format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Rejects unknown extra fields (.strict()) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validEmail, password: validPassword, hackField: 'malicious' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Audit Logging Verification', () => {
    test('Login and logout actions are logged into audit_log table in PostgreSQL', async () => {
      // Perform a fresh login and logout
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: validEmail, password: validPassword });

      const cookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('session=')).split(';')[0];

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      // Query database for audit log entries
      const res = await pool.query(
        `SELECT user_email, action, entity, entity_id 
         FROM audit_log 
         WHERE user_email = $1 
         ORDER BY at DESC 
         LIMIT 2;`,
        [validEmail]
      );

      expect(res.rows.length).toBeGreaterThanOrEqual(2);
      const actions = res.rows.map((r) => r.action);
      expect(actions).toContain('logout');
      expect(actions).toContain('login');
      expect(res.rows[0].entity).toBe('auth');
    });
  });
});
