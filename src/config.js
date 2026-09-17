const parseOrigins = (value) => {
  if (!value || value === '*') return '*';
  return value.split(',').map((origin) => origin.trim());
};

export function loadConfig(env = process.env) {
  return {
    env: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 5000),
    mongoUri: env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/bookmarks',
    corsOrigin: parseOrigins(env.CORS_ORIGIN),
  };
}

export const config = loadConfig();
