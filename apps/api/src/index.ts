// -------------------------------------------------
// Server entry point
// -------------------------------------------------

import app from './app';
import { config } from './config';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Lammart API listening on http://0.0.0.0:${config.port} (${config.nodeEnv})`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
