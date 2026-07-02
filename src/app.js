import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { config } from './config.js';
import { openapiSpec } from './docs/openapi.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { favoriteRouter } from './routes/favorite.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  if (config.env !== 'test') {
    app.use(morgan('dev'));
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Documentación Swagger. Se relaja la CSP de helmet solo aquí porque
  // Swagger UI necesita estilos/scripts inline para renderizarse.
  app.use(
    '/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, { customSiteTitle: 'API de Favoritos - Docs' }),
  );
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', favoriteRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
