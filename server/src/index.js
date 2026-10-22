import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  const origins = config.clientOrigins.length ? config.clientOrigins.join(', ') : 'any origin';
  console.log(`Atmos API listening on :${config.port} (CORS: ${origins})`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
