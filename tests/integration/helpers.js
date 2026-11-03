export const TEST_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/bookmarks_test';

// Las pruebas borran la base al terminar: se detienen antes de conectar si no es
// una base de pruebas, por ejemplo con MONGODB_URI definida en la terminal.
const databaseName = /\/([^/?]+)(?:\?.*)?$/.exec(TEST_URI)?.[1] ?? '';
if (!databaseName.endsWith('_test')) {
  throw new Error(`Las pruebas solo corren en bases terminadas en _test, no en "${databaseName}"`);
}
