// -------------------------------------------------
// Express application — route mounting
// -------------------------------------------------

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import partyRoutes from './routes/parties';
import transactionRoutes from './routes/transactions';
import inventoryRoutes from './routes/inventory';
import reportRoutes from './routes/reports';
import uploadRoutes from './routes/upload';
import { config } from './config';

const app = express();

// ── Middleware ───────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded images
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// ── API Routes ──────────────────────────────────
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/catalog',      catalogRoutes);        // /variants
app.use('/api/v1/parties',      partyRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/inventory',    inventoryRoutes);       // /stock, /purchase-inward, /transfer
app.use('/api/v1/reports',      reportRoutes);          // /dashboard, /commissions, /payments
app.use('/api/v1/upload',       uploadRoutes);

// ── Health check ────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Global error handler ────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
