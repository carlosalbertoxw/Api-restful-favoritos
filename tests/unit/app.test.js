import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { RATE_LIMIT_MESSAGE, createApp } from '../../src/app.js';
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
      assert.deepEqual(Object.keys(paths['/api/v1/bookmarks']), ['get', 'post']);
      assert.deepEqual(Object.keys(paths['/api/v1/bookmarks/{id}']), ['get', 'patch', 'delete']);
    });

    it('genera las reglas de entrada desde zod', async () => {
      const { BookmarkInput, BookmarkUpdate } = (await spec()).components.schemas;

      assert.equal(BookmarkInput.$schema, undefined);
      assert.deepEqual(BookmarkInput.required, ['title', 'url']);
      assert.equal(BookmarkInput.properties.title.maxLength, 200);
      assert.equal(BookmarkInput.properties.description.maxLength, 1000);
      assert.equal(BookmarkInput.properties.url.format, 'uri');

      assert.equal(BookmarkUpdate.required, undefined);
      assert.equal(BookmarkUpdate.minProperties, 1);
    });

    it('publica un patrón de URL que también admite mayúsculas, como la API', async () => {
      const { pattern } = (await spec()).components.schemas.BookmarkInput.properties.url;
      assert.match('HTTPS://A.COM', new RegExp(pattern));
      assert.doesNotMatch('ftp://a.com', new RegExp(pattern));
    });

    it('documenta hasMore en el listado y el 429 en todas las rutas de /api', async () => {
      const { paths } = await spec();
      const lista = paths['/api/v1/bookmarks'].get.responses[200].content['application/json'].schema;
      assert.deepEqual(lista.required, ['bookmarks', 'hasMore']);
      assert.equal(lista.properties.hasMore.type, 'boolean');

      for (const [ruta, operaciones] of Object.entries(paths)) {
        if (!ruta.startsWith('/api/')) continue;
        for (const [metodo, { responses }] of Object.entries(operaciones)) {
          assert.ok(responses[429], `${metodo.toUpperCase()} ${ruta} sin 429`);
        }
      }
    });

    it('documenta los parámetros de paginación', async () => {
      const { parameters } = (await spec()).paths['/api/v1/bookmarks'].get;
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

  it('aplica cabeceras de seguridad y, por defecto, no envía CORS', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://ejemplo.com');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('envía CORS solo para los orígenes configurados', async () => {
    const conCors = createApp({ corsOrigin: ['https://a.com'] });
    const permitido = await request(conCors).get('/health').set('Origin', 'https://a.com');
    assert.equal(permitido.headers['access-control-allow-origin'], 'https://a.com');
    const otro = await request(conCors).get('/health').set('Origin', 'https://b.com');
    assert.equal(otro.headers['access-control-allow-origin'], undefined);
  });

  describe('X-Request-Id', () => {
    it('genera un id por petición', async () => {
      const res = await request(app).get('/health');
      assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/);
    });

    it('respeta el id que envía un proxy si tiene un formato seguro', async () => {
      const res = await request(app).get('/health').set('X-Request-Id', 'abc-123');
      assert.equal(res.headers['x-request-id'], 'abc-123');
    });

    it('reemplaza un id con caracteres no permitidos', async () => {
      const res = await request(app).get('/health').set('X-Request-Id', 'a b<script>');
      assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/);
    });
  });

  it('limita las peticiones por minuto en /api, pero no en /health', async () => {
    const limitada = createApp({ rateLimitPerMinute: 2 });
    const get = () => request(limitada).get('/api/v1/bookmarks').query({ limit: 0 });

    assert.equal((await get()).status, 400);
    assert.equal((await get()).status, 400);
    const res = await get();
    assert.equal(res.status, 429);
    assert.deepEqual(res.body, { message: RATE_LIMIT_MESSAGE });
    assert.ok(res.headers.ratelimit);

    assert.equal((await request(limitada).get('/health')).status, 200);
  });

  it('responde 404 en rutas desconocidas', async () => {
    const res = await request(app).get('/no-existe');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { message: 'Recurso no encontrado' });
  });

  it('ya no expone las rutas anteriores', async () => {
    assert.equal((await request(app).post('/api/favorito').send({})).status, 404);
    assert.equal((await request(app).get('/api/favoritos')).status, 404);
    assert.equal((await request(app).get('/api/bookmarks')).status, 404);
    assert.equal((await request(app).put('/api/v1/bookmarks/123').send({})).status, 404);
  });

  it('valida el cuerpo antes de acceder a la base de datos', async () => {
    const res = await request(app).post('/api/v1/bookmarks').send({ title: '', url: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Datos inválidos');
  });

  it('no interpreta formularios urlencoded', async () => {
    const res = await request(app)
      .post('/api/v1/bookmarks')
      .type('form')
      .send({ title: 'A', url: 'https://a.com' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, [
      { path: '', message: 'El cuerpo de la petición debe ser un objeto JSON' },
    ]);
  });

  it('valida la paginación antes de acceder a la base de datos', async () => {
    const res = await request(app).get('/api/v1/bookmarks').query({ limit: 101 });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, [
      { path: 'limit', message: 'limit debe ser un entero entre 1 y 100' },
    ]);
  });

  describe('cuerpos que express.json() no puede procesar', () => {
    const post = () => request(app).post('/api/v1/bookmarks');

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
    const res = await request(app).delete('/api/v1/bookmarks/123');
    assert.equal(res.status, 400);
  });
});
