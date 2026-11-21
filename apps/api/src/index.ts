import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Lammart API server listening on http://localhost:${config.port} (env: ${config.nodeEnv})`);
});

const gracefulShutdown = () => {
  console.log('Shutting down API server gracefully...');
  server.close(() => {
    console.log('API server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default server;
