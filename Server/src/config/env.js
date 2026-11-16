import dotenv from 'dotenv';
dotenv.config();

function parseAllowedUsers(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse ALLOWED_USERS from environment:', err.message);
    return [];
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'nutrients_ocean_super_secure_jwt_secret_2026_kolkata',
  ALLOWED_USERS: parseAllowedUsers(process.env.ALLOWED_USERS),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  TZ: process.env.TZ || 'Asia/Kolkata',
};
