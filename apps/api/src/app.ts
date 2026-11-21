import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { catalogRouter } from './modules/catalog/catalog.router';

export const createApp = (): Express => {
  const app = express();

  // Basic middleware
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(config.cookieSecret));

  // Healthcheck endpoints
  const healthHandler = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Mount API modules
  app.use('/api/v1', catalogRouter);

  return app;
};

export const app = createApp();
export default app;
