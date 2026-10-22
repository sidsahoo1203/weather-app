import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { api } from './routes/api.js';

const escapeRegex = (value) => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Builds an origin check from patterns like "https://my-app-*.vercel.app". */
export function originMatcher(patterns) {
  if (!patterns.length) return () => true;
  const regexes = patterns.map(
    (pattern) => new RegExp(`^${pattern.split('*').map(escapeRegex).join('[^/.]*')}$`),
  );
  return (origin) => regexes.some((re) => re.test(origin.replace(/\/$/, '')));
}

export function createApp({ clientOrigins = config.clientOrigins } = {}) {
  const app = express();
  const isAllowed = originMatcher(clientOrigins);

  app.set('trust proxy', 1); // Render terminates TLS in front of the app.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: (origin, done) => done(null, !origin || isAllowed(origin)),
      methods: ['GET'],
      maxAge: 86400,
    }),
  );
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: config.rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { message: 'Too many requests, please slow down.' } },
    }),
  );

  app.get('/', (req, res) => {
    res.json({
      name: 'Atmos API',
      endpoints: [
        'GET /api/health',
        'GET /api/weather?lat=&lon=',
        'GET /api/geocode/search?q=',
        'GET /api/geocode/reverse?lat=&lon=',
        'GET /api/region?lat=&lon=',
      ],
    });
  });

  app.use('/api', api);

  app.use((req, res) => {
    res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = Number.isInteger(err.status) && err.status >= 400 ? err.status : 500;
    if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err.message);
    res.status(status).json({
      error: { message: status === 500 ? 'Internal server error' : err.message },
    });
  });

  return app;
}
