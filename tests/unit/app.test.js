import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.js';
import pkg from '../../package.json' with { type: 'json' };

// Solo rutas que responden antes de llegar a MongoDB: no necesitan base de datos.
const app = createApp();

describe('app (sin base de datos)', () => {
  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('GET /health/ready responde 503 sin conexión a MongoDB', async () => {
    const res = await request(app).get('/health/ready');
    assert.equal(res.status, 503);
    assert.deepEqual(res.body, { status: 'error', checks: { database: 'down' } });
  });

  describe('GET /openapi.json', () => {
    const spec = async () => (await request(app).get('/openapi.json').expect(200)).body;

    it('expone la especificación con la versión del paquete y un servidor relativo', async () => {
      const { openapi, info, servers, paths } = await spec();
      assert.equal(openapi, '3.1.0');
      assert.equal(info.version, pkg.version);
      assert.deepEqual(servers, [{ url: '/' }]);
      assert.deepEqual(Object.keys(paths['/api/favoritos']), ['get', 'post']);
      assert.deepEqual(Object.keys(paths['/api/favoritos/{id}']), ['get', 'patch', 'delete']);
    });

    it('genera las reglas de entrada desde zod', async () => {
      const { FavoriteInput, FavoriteUpdate } = (await spec()).components.schemas;

      assert.equal(FavoriteInput.$schema, undefined);
      assert.deepEqual(FavoriteInput.required, ['title', 'url']);
      assert.equal(FavoriteInput.properties.title.maxLength, 200);
      assert.equal(FavoriteInput.properties.description.maxLength, 1000);
      assert.equal(FavoriteInput.properties.url.format, 'uri');

      assert.equal(FavoriteUpdate.required, undefined);
      assert.equal(FavoriteUpdate.minProperties, 1);
    });

    it('publica un patrón de URL que también admite mayúsculas, como la API', async () => {
      const { pattern } = (await spec()).components.schemas.FavoriteInput.properties.url;
      assert.match('HTTPS://A.COM', new RegExp(pattern));
      assert.doesNotMatch('ftp://a.com', new RegExp(pattern));
    });

    it('documenta los parámetros de paginación', async () => {
      const { parameters } = (await spec()).paths['/api/favoritos'].get;
      const [limit, skip] = parameters;
      assert.equal(limit.name, 'limit');
      assert.equal(limit.in, 'query');
      assert.equal(limit.schema.type, 'integer');
      assert.equal(limit.schema.maximum, 100);
      assert.equal(limit.schema.default, 100);
      assert.equal(skip.name, 'skip');
      assert.equal(skip.schema.default, 0);
    });
  });

  it('GET /docs/ sirve Swagger UI con la CSP estricta', async () => {
    const res = await request(app).get('/docs/');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.match(res.text, /API de Favoritos - Docs/);
    assert.match(res.headers['content-security-policy'], /script-src 'self'/);
  });

  it('aplica cabeceras de seguridad y CORS', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://ejemplo.com');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });

  it('responde 404 en rutas desconocidas', async () => {
    const res = await request(app).get('/no-existe');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { message: 'Recurso no encontrado' });
  });

  it('ya no expone las rutas anteriores', async () => {
    assert.equal((await request(app).post('/api/favorito').send({})).status, 404);
    assert.equal((await request(app).put('/api/favoritos/123').send({})).status, 404);
  });

  it('valida el cuerpo antes de acceder a la base de datos', async () => {
    const res = await request(app).post('/api/favoritos').send({ title: '', url: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Datos inválidos');
  });

  it('no interpreta formularios urlencoded', async () => {
    const res = await request(app)
      .post('/api/favoritos')
      .type('form')
      .send({ title: 'A', url: 'https://a.com' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, [
      { path: '', message: 'El cuerpo de la petición debe ser un objeto JSON' },
    ]);
  });

  it('valida la paginación antes de acceder a la base de datos', async () => {
    const res = await request(app).get('/api/favoritos').query({ limit: 101 });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, [
      { path: 'limit', message: 'limit debe ser un entero entre 1 y 100' },
    ]);
  });

  describe('cuerpos que express.json() no puede procesar', () => {
    const post = () => request(app).post('/api/favoritos');

    it('responde 400 ante JSON malformado', async () => {
      const res = await post().set('Content-Type', 'application/json').send('{"title": ');
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, { message: 'El cuerpo de la petición no es un JSON válido' });
    });

    it('responde 400 ante un cuerpo que no es JSON', async () => {
      const res = await post().set('Content-Type', 'application/json').send('no-json');
      assert.equal(res.status, 400);
    });

    it('responde 413 si el cuerpo supera el límite', async () => {
      const res = await post()
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ title: 'a', url: 'https://a.com', description: 'x'.repeat(200_000) }));
      assert.equal(res.status, 413);
      assert.deepEqual(res.body, { message: 'El cuerpo de la petición es demasiado grande' });
    });

    it('responde 415 con un charset no soportado', async () => {
      const res = await post().set('Content-Type', 'application/json; charset=latin-9').send('{}');
      assert.equal(res.status, 415);
      assert.deepEqual(res.body, { message: 'Codificación de caracteres no soportada' });
    });
  });

  it('valida el id antes de acceder a la base de datos', async () => {
    const res = await request(app).delete('/api/favoritos/123');
    assert.equal(res.status, 400);
  });
});
