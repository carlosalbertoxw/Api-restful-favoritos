import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { config, loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('usa valores por defecto', () => {
    assert.deepEqual(loadConfig({}), {
      env: 'development',
      port: 5000,
      mongoUri: 'mongodb://127.0.0.1:27017/bookmarks',
      corsOrigin: '*',
    });
  });

  it('lee las variables de entorno', () => {
    const result = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      MONGODB_URI: 'mongodb://db:27017/app',
      CORS_ORIGIN: '*',
    });
    assert.equal(result.env, 'production');
    assert.equal(result.port, 8080);
    assert.equal(result.mongoUri, 'mongodb://db:27017/app');
    assert.equal(result.corsOrigin, '*');
  });

  it('separa y recorta la lista de orígenes CORS', () => {
    const result = loadConfig({ CORS_ORIGIN: 'https://a.com, https://b.com' });
    assert.deepEqual(result.corsOrigin, ['https://a.com', 'https://b.com']);
  });

  it('config se carga desde process.env', () => {
    assert.equal(config.env, 'test');
  });
});
