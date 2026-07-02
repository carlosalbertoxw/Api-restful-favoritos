process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/db.js';
import { Favorite } from '../src/models/favorite.model.js';

const TEST_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/bookmarks_test';

const app = createApp();
let connection;

before(async () => {
  connection = await connectDatabase(TEST_URI);
});

after(async () => {
  await connection.dropDatabase();
  await disconnectDatabase();
});

beforeEach(async () => {
  await Favorite.deleteMany({});
});

const ejemplo = { title: 'Google', description: 'Buscador', url: 'https://google.com' };

describe('API de favoritos', () => {
  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('POST /api/favorito crea un marcador', async () => {
    const res = await request(app).post('/api/favorito').send(ejemplo);
    assert.equal(res.status, 201);
    assert.equal(res.body.favorito.title, 'Google');
    assert.ok(res.body.favorito.id);
    assert.equal(res.body.favorito._id, undefined);
  });

  it('POST /api/favorito rechaza datos inválidos', async () => {
    const res = await request(app).post('/api/favorito').send({ title: '', url: 'no-es-url' });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  it('GET /api/favoritos lista los marcadores', async () => {
    await Favorite.create(ejemplo);
    const res = await request(app).get('/api/favoritos');
    assert.equal(res.status, 200);
    assert.equal(res.body.favoritos.length, 1);
  });

  it('GET /api/favorito/:id devuelve 404 si no existe', async () => {
    const res = await request(app).get('/api/favorito/64b8f0c2a1b2c3d4e5f60718');
    assert.equal(res.status, 404);
  });

  it('GET /api/favorito/:id devuelve 400 con id inválido', async () => {
    const res = await request(app).get('/api/favorito/123');
    assert.equal(res.status, 400);
  });

  it('PUT /api/favorito/:id actualiza un marcador', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app)
      .put(`/api/favorito/${creado.id}`)
      .send({ title: 'Google actualizado' });
    assert.equal(res.status, 200);
    assert.equal(res.body.favorito.title, 'Google actualizado');
  });

  it('DELETE /api/favorito/:id elimina un marcador', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app).delete(`/api/favorito/${creado.id}`);
    assert.equal(res.status, 200);
    assert.equal(await Favorite.countDocuments(), 0);
  });
});
