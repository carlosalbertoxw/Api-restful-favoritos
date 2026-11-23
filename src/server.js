import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { logger } from './logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

try {
  await connectDatabase();
  logger.info('Conexión a MongoDB establecida');

  // Express 5 también llama a este callback si no puede abrir el puerto.
  const server = app.listen(config.port, (error) => {
    if (error) {
      logger.fatal({ err: error }, 'No se pudo abrir el puerto');
      process.exit(1);
    }
    logger.info(`Servidor escuchando en http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} recibido, cerrando servidor...`);
    // Fuerza la salida si una conexión no termina a tiempo.
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info('Conexiones cerradas');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Error al cerrar la conexión a MongoDB');
        process.exit(1);
      }
    });
  };

  // Con once, repetir la señal termina el proceso sin esperar el cierre ordenado.
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  logger.fatal({ err: error }, 'No se pudo iniciar el servidor');
  process.exit(1);
}
