import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

// Route imports
import authRoutes from './routes/auth.js';
import harvestRoutes from './routes/harvests.js';
import marketRoutes from './routes/markets.js';
import decisionRoutes from './routes/decisions.js';
import warehouseRoutes from './routes/warehouses.js';
import logisticsRoutes from './routes/logistics.js';
import biomassRoutes from './routes/biomass.js';
import buyerRoutes from './routes/buyers.js';
import bookingRoutes from './routes/bookings.js';
import analyticsRoutes from './routes/analytics.js';
import assistantRoutes from './routes/assistant.js';

export function createApp() {
  const app = express();

  // Dynamic CORS for Vercel deployments and local development
  const staticOrigins = [
    env.clientUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        staticOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all configured clients
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Root endpoint & Health checks
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'AgriConnect AI Backend API is live and operational!',
      status: 'UP',
      database: 'Connected to MongoDB Atlas',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'UP',
      service: 'AgriConnect AI Node.js Express Backend',
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime()
    });
  });

  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'AgriConnect AI REST API Gateway is operational!',
      version: '1.0.0',
      database: 'Connected to MongoDB Atlas',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        markets: '/api/markets/overview',
        harvests: '/api/harvests',
        warehouses: '/api/warehouses',
        logistics: '/api/logistics',
        biomass: '/api/biomass',
        buyers: '/api/buyers',
        bookings: '/api/bookings',
        decisions: '/api/decisions',
        analytics: '/api/analytics',
        ai: '/api/ai'
      }
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'AgriConnect AI Backend API',
      database: 'Connected to MongoDB Atlas',
      ml_service_url: env.mlServiceUrl,
      timestamp: new Date().toISOString()
    });
  });

  // Mount API endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/harvests', harvestRoutes);
  app.use('/api/markets', marketRoutes);
  app.use('/api/decisions', decisionRoutes);
  app.use('/api/warehouses', warehouseRoutes);
  app.use('/api/logistics', logisticsRoutes);
  app.use('/api/biomass', biomassRoutes);
  app.use('/api/buyers', buyerRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', assistantRoutes);

  // 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
