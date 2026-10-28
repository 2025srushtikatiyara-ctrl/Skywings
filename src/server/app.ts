/**
 * Express Application Configuration
 * Integrates CORS, JSON parsing, security headers, and modular API routers.
 */

import express from 'express';
import { flightsRouter } from './routes/flights';
import { bookingsRouter } from './routes/bookings';
import { adminRouter } from './routes/admin';

export const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SKY WINGS Airline Reservation API',
    version: '1.0.0',
  });
});

// Mount modular sub-routers
app.use('/api/flights', flightsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);

// Centralized error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred',
    code: err.code || 'INTERNAL_ERROR',
  });
});
