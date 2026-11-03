import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

try {
  await connectDatabase();
  console.log('✅ Conexión a MongoDB establecida');

  // Express 5 también llama a este callback si no puede abrir el puerto.
  const server = app.listen(config.port, (error) => {
    if (error) {
      console.error('❌ No se pudo abrir el puerto:', error);
      process.exit(1);
    }
    console.log(`🚀 Servidor escuchando en http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} recibido, cerrando servidor...`);
    // Fuerza la salida si una conexión no termina a tiempo.
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      try {
        await disconnectDatabase();
        console.log('👋 Conexiones cerradas. Hasta luego.');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error al cerrar la conexión a MongoDB:', error);
        process.exit(1);
      }
    });
  };

  // Con once, repetir la señal termina el proceso sin esperar el cierre ordenado.
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('❌ No se pudo iniciar el servidor:', error);
  process.exit(1);
}
