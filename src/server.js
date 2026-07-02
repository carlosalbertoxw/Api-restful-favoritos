import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';

const app = createApp();

try {
  await connectDatabase();
  console.log('✅ Conexión a MongoDB establecida');

  const server = app.listen(config.port, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} recibido, cerrando servidor...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('👋 Conexiones cerradas. Hasta luego.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('❌ No se pudo iniciar el servidor:', error);
  process.exit(1);
}
