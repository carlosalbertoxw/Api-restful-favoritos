import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from './config.js';
import { openapiSpec } from './docs/openapi.js';
import { httpLogger } from './logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { bookmarkRouter } from './routes/bookmark.routes.js';
import { healthRouter } from './routes/health.routes.js';

export const RATE_LIMIT_MESSAGE = 'Demasiadas peticiones, intenta de nuevo en un minuto';

export function createApp({
  corsOrigin = config.corsOrigin,
  rateLimitPerMinute = config.rateLimitPerMinute,
} = {}) {
  const app = express();

  // Detrás de nginx, la IP real del cliente llega en X-Forwarded-For.
  app.set('trust proxy', config.trustProxy);

  app.use(httpLogger);
  app.use(helmet());
  if (corsOrigin) {
    app.use(cors({ origin: corsOrigin }));
  }
  app.use(express.json());

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, { customSiteTitle: 'API de Favoritos - Docs' }),
  );
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

  app.use('/health', healthRouter);
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: RATE_LIMIT_MESSAGE },
    }),
  );
  app.use('/api/v1', bookmarkRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
