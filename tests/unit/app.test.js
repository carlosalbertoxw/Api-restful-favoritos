import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.js';

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

  it('GET /openapi.json expone la especificación', async () => {
    const res = await request(app).get('/openapi.json');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.1.0');
    assert.ok(res.body.paths['/api/favorito/{id}']);
  });

  it('GET /docs/ sirve Swagger UI', async () => {
    const res = await request(app).get('/docs/');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.match(res.text, /API de Favoritos - Docs/);
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

  it('valida el cuerpo antes de acceder a la base de datos', async () => {
    const res = await request(app).post('/api/favorito').send({ title: '', url: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Datos inválidos');
  });

  describe('cuerpos que express.json() no puede procesar', () => {
    const post = () => request(app).post('/api/favorito');

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
    const res = await request(app).delete('/api/favorito/123');
    assert.equal(res.status, 400);
  });
});
