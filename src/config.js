import { z } from 'zod';

// Una variable vacía (p. ej. `CORS_ORIGIN=` en Compose) cuenta como no definida.
const optional = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema);

const envSchema = z.object({
  NODE_ENV: optional(z.enum(['development', 'test', 'production']).default('development')),
  PORT: optional(z.coerce.number().int().min(1).max(65_535).default(5000)),
  MONGODB_URI: optional(
    z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, 'debe empezar con mongodb:// o mongodb+srv://')
      .default('mongodb://127.0.0.1:27017/bookmarks'),
  ),
  // Sin definir, la API no envía cabeceras CORS: el frontend la usa desde su mismo origen.
  CORS_ORIGIN: optional(z.string().optional()),
  RATE_LIMIT_PER_MINUTE: optional(z.coerce.number().int().min(1).default(100)),
  // Proxies de confianza delante de la API, con la sintaxis de "trust proxy" de Express:
  // un número de saltos o una lista de redes (p. ej. "uniquelocal" para la red de Docker).
  TRUST_PROXY: optional(
    z
      .string()
      .regex(/^[\w.:/, -]+$/, 'debe ser un número o una lista de redes')
      .transform((value) => (/^\d+$/.test(value) ? Number(value) : value))
      .optional(),
  ),
});

const parseOrigins = (value) => {
  if (value === undefined) return undefined;
  if (value === '*') return '*';
  return value.split(',').map((origin) => origin.trim());
};

export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración inválida (${detail})`);
  }

  const vars = result.data;
  return {
    env: vars.NODE_ENV,
    port: vars.PORT,
    mongoUri: vars.MONGODB_URI,
    corsOrigin: parseOrigins(vars.CORS_ORIGIN),
    rateLimitPerMinute: vars.RATE_LIMIT_PER_MINUTE,
    trustProxy: vars.TRUST_PROXY ?? false,
  };
}

export const config = loadConfig();
