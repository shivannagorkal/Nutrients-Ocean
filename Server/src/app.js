import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import hpp from 'hpp';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { csrfProtection } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Trust proxy for secure cookies behind reverse proxy (Render/Railway)
app.set('trust proxy', 1);

// Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
    hidePoweredBy: true,
  })
);

// CORS locked to FRONTEND_ORIGIN with credentials
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

// HTTP Parameter Pollution protection
app.use(hpp());

// Body parser with 100kb limit per Section 11
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie Parser
app.use(cookieParser());

// Morgan logging (method, path, status, response-time - never log bodies, cookies, or secrets)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :response-time ms'));
}

// Health check endpoint (no auth required) - Section 8 & Section 14
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// API Routes with CSRF protection
app.use('/api', csrfProtection, apiRoutes);

// Centralized error handler
app.use(errorHandler);

export default app;
