import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { config, loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('usa valores por defecto', () => {
    assert.deepEqual(loadConfig({}), {
      env: 'development',
      port: 5000,
      mongoUri: 'mongodb://127.0.0.1:27017/bookmarks',
      corsOrigin: undefined,
      rateLimitPerMinute: 100,
      trustProxy: false,
    });
  });

  it('lee las variables de entorno', () => {
    const result = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      MONGODB_URI: 'mongodb://db:27017/app',
      CORS_ORIGIN: '*',
      RATE_LIMIT_PER_MINUTE: '30',
      TRUST_PROXY: 'uniquelocal',
    });
    assert.equal(result.env, 'production');
    assert.equal(result.port, 8080);
    assert.equal(result.mongoUri, 'mongodb://db:27017/app');
    assert.equal(result.corsOrigin, '*');
    assert.equal(result.rateLimitPerMinute, 30);
    assert.equal(result.trustProxy, 'uniquelocal');
  });

  it('trata las variables vacías como no definidas', () => {
    const result = loadConfig({ PORT: '', CORS_ORIGIN: '', TRUST_PROXY: '' });
    assert.equal(result.port, 5000);
    assert.equal(result.corsOrigin, undefined);
    assert.equal(result.trustProxy, false);
  });

  it('convierte TRUST_PROXY numérico en número de saltos', () => {
    assert.equal(loadConfig({ TRUST_PROXY: '1' }).trustProxy, 1);
  });

  it('separa y recorta la lista de orígenes CORS', () => {
    const result = loadConfig({ CORS_ORIGIN: 'https://a.com, https://b.com' });
    assert.deepEqual(result.corsOrigin, ['https://a.com', 'https://b.com']);
  });

  const invalidos = [
    [{ PORT: 'abc' }, /PORT/],
    [{ PORT: '70000' }, /PORT/],
    [{ NODE_ENV: 'prod' }, /NODE_ENV/],
    [{ MONGODB_URI: 'http://db' }, /MONGODB_URI: debe empezar con mongodb/],
    [{ RATE_LIMIT_PER_MINUTE: '0' }, /RATE_LIMIT_PER_MINUTE/],
  ];
  for (const [env, mensaje] of invalidos) {
    it(`falla al arrancar con ${JSON.stringify(env)}`, () => {
      assert.throws(() => loadConfig(env), mensaje);
    });
  }

  it('config se carga desde process.env', () => {
    assert.equal(config.env, 'test');
  });
});
