// Se carga con --import antes que cualquier módulo de la app, para que
// config.js lea NODE_ENV=test (los import de ESM se evalúan antes que el código).
process.env.NODE_ENV ??= 'test';
