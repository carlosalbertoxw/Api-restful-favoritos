import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db.js';
import { Bookmark } from '../../src/models/bookmark.model.js';
import { TEST_URI } from './helpers.js';

const INEXISTENTE = '64b8f0c2a1b2c3d4e5f60718';

const app = createApp();
let connection;

before(async () => {
  connection = await connectDatabase(TEST_URI);
});

after(async () => {
  // Mongoose crea la colección y sus índices al conectar, en segundo plano;
  // se espera a que termine para que no compita con el borrado de la base.
  await Bookmark.init();
  await connection?.dropDatabase();
  await disconnectDatabase();
});

beforeEach(async () => {
  await Bookmark.deleteMany({});
});

const ejemplo = { title: 'Google', description: 'Buscador', url: 'https://google.com' };

describe('POST /api/v1/bookmarks', () => {
  it('crea un marcador y lo persiste', async () => {
    const res = await request(app).post('/api/v1/bookmarks').send(ejemplo);

    assert.equal(res.status, 201);
    assert.equal(res.body.bookmark.title, 'Google');
    assert.equal(typeof res.body.bookmark.id, 'string');
    assert.ok(res.body.bookmark.createdAt);
    assert.equal(res.body.bookmark._id, undefined);

    const guardado = await Bookmark.findById(res.body.bookmark.id);
    assert.equal(guardado.url, 'https://google.com');
  });

  it('guarda los datos normalizados y la descripción por defecto', async () => {
    const res = await request(app)
      .post('/api/v1/bookmarks')
      .send({ title: '  GitHub ', url: ' https://github.com ' });

    assert.equal(res.status, 201);
    const guardado = await Bookmark.findById(res.body.bookmark.id);
    assert.equal(guardado.title, 'GitHub');
    assert.equal(guardado.url, 'https://github.com');
    assert.equal(guardado.description, '');
  });

  for (const url of ['javascript:alert(document.cookie)', 'data:text/html,<script>alert(1)</script>']) {
    it(`rechaza la url peligrosa ${url} sin guardarla`, async () => {
      const res = await request(app).post('/api/v1/bookmarks').send({ title: 'XSS', url });

      assert.equal(res.status, 400);
      assert.deepEqual(res.body.errors, [
        { path: 'url', message: 'La URL debe empezar con http:// o https://' },
      ]);
      assert.equal(await Bookmark.countDocuments(), 0);
    });
  }

  it('responde los errores de validación en español', async () => {
    const res = await request(app).post('/api/v1/bookmarks').send({});

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, {
      message: 'Datos inválidos',
      errors: [
        { path: 'title', message: 'El título es obligatorio' },
        { path: 'url', message: 'La URL es obligatoria' },
      ],
    });
  });

  it('rechaza datos inválidos sin guardar nada', async () => {
    const res = await request(app).post('/api/v1/bookmarks').send({ title: '', url: 'no-es-url' });

    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(await Bookmark.countDocuments(), 0);
  });
});

describe('GET /api/v1/bookmarks', () => {
  it('devuelve una lista vacía si no hay marcadores', async () => {
    const res = await request(app).get('/api/v1/bookmarks');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { bookmarks: [], hasMore: false });
  });

  it('lista los marcadores del más reciente al más antiguo', async () => {
    await Bookmark.create({ ...ejemplo, title: 'Antiguo', createdAt: new Date('2024-01-01') });
    await Bookmark.create({ ...ejemplo, title: 'Reciente', createdAt: new Date('2025-01-01') });

    const res = await request(app).get('/api/v1/bookmarks');

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.bookmarks.map((f) => f.title),
      ['Reciente', 'Antiguo'],
    );
  });

  it('pagina con limit y skip', async () => {
    const titulos = ['A', 'B', 'C'];
    await Bookmark.create(
      titulos.map((title, i) => ({ ...ejemplo, title, createdAt: new Date(2025, 0, i + 1) })),
    );

    const res = await request(app).get('/api/v1/bookmarks').query({ limit: 1, skip: 1 });

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.bookmarks.map((f) => f.title),
      ['B'],
    );
    assert.equal(res.body.hasMore, true);
  });

  it('devuelve como máximo 100 marcadores por defecto', async () => {
    await Bookmark.insertMany(Array.from({ length: 101 }, () => ejemplo));
    const res = await request(app).get('/api/v1/bookmarks');
    assert.equal(res.body.bookmarks.length, 100);
    assert.equal(res.body.hasMore, true);
  });
});

describe('GET /api/v1/bookmarks/:id', () => {
  it('devuelve el marcador', async () => {
    const creado = await Bookmark.create(ejemplo);
    const res = await request(app).get(`/api/v1/bookmarks/${creado.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.bookmark.id, creado.id);
    assert.equal(res.body.bookmark.title, 'Google');
  });

  it('devuelve 404 si no existe', async () => {
    const res = await request(app).get(`/api/v1/bookmarks/${INEXISTENTE}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.message, 'No existe el marcador');
  });

  it('devuelve 400 con id inválido', async () => {
    const res = await request(app).get('/api/v1/bookmarks/123');
    assert.equal(res.status, 400);
  });
});

describe('PATCH /api/v1/bookmarks/:id', () => {
  it('actualiza solo los campos enviados', async () => {
    const creado = await Bookmark.create(ejemplo);
    const res = await request(app)
      .patch(`/api/v1/bookmarks/${creado.id}`)
      .send({ title: 'Google actualizado' });

    assert.equal(res.status, 200);
    assert.equal(res.body.bookmark.title, 'Google actualizado');
    assert.equal(res.body.bookmark.url, ejemplo.url);

    const guardado = await Bookmark.findById(creado.id);
    assert.equal(guardado.title, 'Google actualizado');
    assert.equal(guardado.description, 'Buscador');
  });

  it('devuelve 400 con cuerpo vacío', async () => {
    const creado = await Bookmark.create(ejemplo);
    const res = await request(app).patch(`/api/v1/bookmarks/${creado.id}`).send({});
    assert.equal(res.status, 400);
  });

  it('devuelve 400 con url inválida y no modifica el marcador', async () => {
    const creado = await Bookmark.create(ejemplo);
    const res = await request(app).patch(`/api/v1/bookmarks/${creado.id}`).send({ url: 'mal' });

    assert.equal(res.status, 400);
    assert.equal((await Bookmark.findById(creado.id)).url, ejemplo.url);
  });

  it('no permite cambiar la url a javascript:', async () => {
    const creado = await Bookmark.create(ejemplo);
    const res = await request(app)
      .patch(`/api/v1/bookmarks/${creado.id}`)
      .send({ url: 'javascript:alert(1)' });

    assert.equal(res.status, 400);
    assert.equal((await Bookmark.findById(creado.id)).url, ejemplo.url);
  });

  it('devuelve 404 si no existe', async () => {
    const res = await request(app).patch(`/api/v1/bookmarks/${INEXISTENTE}`).send({ title: 'X' });
    assert.equal(res.status, 404);
  });
});

describe('DELETE /api/v1/bookmarks/:id', () => {
  it('elimina el marcador y responde 204 sin cuerpo', async () => {
    const creado = await Bookmark.create(ejemplo);
    const res = await request(app).delete(`/api/v1/bookmarks/${creado.id}`);

    assert.equal(res.status, 204);
    assert.equal(res.text, '');
    assert.equal(await Bookmark.countDocuments(), 0);
  });

  it('devuelve 404 si no existe', async () => {
    const res = await request(app).delete(`/api/v1/bookmarks/${INEXISTENTE}`);
    assert.equal(res.status, 404);
  });
});

describe('flujo completo', () => {
  it('crea, consulta, actualiza y elimina un marcador', async () => {
    const creado = await request(app).post('/api/v1/bookmarks').send(ejemplo).expect(201);
    const { id } = creado.body.bookmark;

    await request(app).get(`/api/v1/bookmarks/${id}`).expect(200);
    const actualizado = await request(app)
      .patch(`/api/v1/bookmarks/${id}`)
      .send({ description: 'Motor de búsqueda' })
      .expect(200);
    assert.equal(actualizado.body.bookmark.description, 'Motor de búsqueda');

    const lista = await request(app).get('/api/v1/bookmarks').expect(200);
    assert.equal(lista.body.bookmarks.length, 1);

    await request(app).delete(`/api/v1/bookmarks/${id}`).expect(204);
    await request(app).get(`/api/v1/bookmarks/${id}`).expect(404);
  });
});
