import { randomUUID } from 'node:crypto';

import pino from 'pino';
import { pinoHttp } from 'pino-http';

import { config } from './config.js';

const LEVELS = { production: 'info', development: 'debug', test: 'silent' };

// JSON en producción; en desarrollo, legible con pino-pretty (dependencia de desarrollo).
export const logger = pino({
  level: LEVELS[config.env],
  ...(config.env === 'development' && {
    transport: { target: 'pino-pretty', options: { ignore: 'pid,hostname' } },
  }),
});

const REQUEST_ID = /^[\w-]{1,64}$/;

// Registra cada petición con un id que también se devuelve en la cabecera X-Request-Id.
// Se respeta el id que envíe un proxy (nginx manda $request_id) si tiene un formato seguro.
export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url.startsWith('/health') },
  // Solo lo necesario para seguir una petición: sin cabeceras (podrían llevar credenciales).
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.raw.ip }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
