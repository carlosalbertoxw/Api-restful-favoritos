import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db.js';
import { Favorite } from '../../src/models/favorite.model.js';
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
  await Favorite.init();
  await connection?.dropDatabase();
  await disconnectDatabase();
});

beforeEach(async () => {
  await Favorite.deleteMany({});
});

const ejemplo = { title: 'Google', description: 'Buscador', url: 'https://google.com' };

describe('POST /api/favoritos', () => {
  it('crea un marcador y lo persiste', async () => {
    const res = await request(app).post('/api/favoritos').send(ejemplo);

    assert.equal(res.status, 201);
    assert.equal(res.body.favorito.title, 'Google');
    assert.equal(typeof res.body.favorito.id, 'string');
    assert.ok(res.body.favorito.createdAt);
    assert.equal(res.body.favorito._id, undefined);

    const guardado = await Favorite.findById(res.body.favorito.id);
    assert.equal(guardado.url, 'https://google.com');
  });

  it('guarda los datos normalizados y la descripción por defecto', async () => {
    const res = await request(app)
      .post('/api/favoritos')
      .send({ title: '  GitHub ', url: ' https://github.com ' });

    assert.equal(res.status, 201);
    const guardado = await Favorite.findById(res.body.favorito.id);
    assert.equal(guardado.title, 'GitHub');
    assert.equal(guardado.url, 'https://github.com');
    assert.equal(guardado.description, '');
  });

  for (const url of ['javascript:alert(document.cookie)', 'data:text/html,<script>alert(1)</script>']) {
    it(`rechaza la url peligrosa ${url} sin guardarla`, async () => {
      const res = await request(app).post('/api/favoritos').send({ title: 'XSS', url });

      assert.equal(res.status, 400);
      assert.deepEqual(res.body.errors, [
        { path: 'url', message: 'La URL debe empezar con http:// o https://' },
      ]);
      assert.equal(await Favorite.countDocuments(), 0);
    });
  }

  it('responde los errores de validación en español', async () => {
    const res = await request(app).post('/api/favoritos').send({});

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
    const res = await request(app).post('/api/favoritos').send({ title: '', url: 'no-es-url' });

    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(await Favorite.countDocuments(), 0);
  });
});

describe('GET /api/favoritos', () => {
  it('devuelve una lista vacía si no hay marcadores', async () => {
    const res = await request(app).get('/api/favoritos');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { favoritos: [] });
  });

  it('lista los marcadores del más reciente al más antiguo', async () => {
    await Favorite.create({ ...ejemplo, title: 'Antiguo', createdAt: new Date('2024-01-01') });
    await Favorite.create({ ...ejemplo, title: 'Reciente', createdAt: new Date('2025-01-01') });

    const res = await request(app).get('/api/favoritos');

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.favoritos.map((f) => f.title),
      ['Reciente', 'Antiguo'],
    );
  });

  it('pagina con limit y skip', async () => {
    const titulos = ['A', 'B', 'C'];
    await Favorite.create(
      titulos.map((title, i) => ({ ...ejemplo, title, createdAt: new Date(2025, 0, i + 1) })),
    );

    const res = await request(app).get('/api/favoritos').query({ limit: 1, skip: 1 });

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.favoritos.map((f) => f.title),
      ['B'],
    );
  });

  it('devuelve como máximo 100 marcadores por defecto', async () => {
    await Favorite.insertMany(Array.from({ length: 101 }, () => ejemplo));
    const res = await request(app).get('/api/favoritos');
    assert.equal(res.body.favoritos.length, 100);
  });
});

describe('GET /api/favoritos/:id', () => {
  it('devuelve el marcador', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app).get(`/api/favoritos/${creado.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.favorito.id, creado.id);
    assert.equal(res.body.favorito.title, 'Google');
  });

  it('devuelve 404 si no existe', async () => {
    const res = await request(app).get(`/api/favoritos/${INEXISTENTE}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.message, 'No existe el marcador');
  });

  it('devuelve 400 con id inválido', async () => {
    const res = await request(app).get('/api/favoritos/123');
    assert.equal(res.status, 400);
  });
});

describe('PATCH /api/favoritos/:id', () => {
  it('actualiza solo los campos enviados', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app)
      .patch(`/api/favoritos/${creado.id}`)
      .send({ title: 'Google actualizado' });

    assert.equal(res.status, 200);
    assert.equal(res.body.favorito.title, 'Google actualizado');
    assert.equal(res.body.favorito.url, ejemplo.url);

    const guardado = await Favorite.findById(creado.id);
    assert.equal(guardado.title, 'Google actualizado');
    assert.equal(guardado.description, 'Buscador');
  });

  it('devuelve 400 con cuerpo vacío', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app).patch(`/api/favoritos/${creado.id}`).send({});
    assert.equal(res.status, 400);
  });

  it('devuelve 400 con url inválida y no modifica el marcador', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app).patch(`/api/favoritos/${creado.id}`).send({ url: 'mal' });

    assert.equal(res.status, 400);
    assert.equal((await Favorite.findById(creado.id)).url, ejemplo.url);
  });

  it('no permite cambiar la url a javascript:', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app)
      .patch(`/api/favoritos/${creado.id}`)
      .send({ url: 'javascript:alert(1)' });

    assert.equal(res.status, 400);
    assert.equal((await Favorite.findById(creado.id)).url, ejemplo.url);
  });

  it('devuelve 404 si no existe', async () => {
    const res = await request(app).patch(`/api/favoritos/${INEXISTENTE}`).send({ title: 'X' });
    assert.equal(res.status, 404);
  });
});

describe('DELETE /api/favoritos/:id', () => {
  it('elimina el marcador y responde 204 sin cuerpo', async () => {
    const creado = await Favorite.create(ejemplo);
    const res = await request(app).delete(`/api/favoritos/${creado.id}`);

    assert.equal(res.status, 204);
    assert.equal(res.text, '');
    assert.equal(await Favorite.countDocuments(), 0);
  });

  it('devuelve 404 si no existe', async () => {
    const res = await request(app).delete(`/api/favoritos/${INEXISTENTE}`);
    assert.equal(res.status, 404);
  });
});

describe('flujo completo', () => {
  it('crea, consulta, actualiza y elimina un marcador', async () => {
    const creado = await request(app).post('/api/favoritos').send(ejemplo).expect(201);
    const { id } = creado.body.favorito;

    await request(app).get(`/api/favoritos/${id}`).expect(200);
    const actualizado = await request(app)
      .patch(`/api/favoritos/${id}`)
      .send({ description: 'Motor de búsqueda' })
      .expect(200);
    assert.equal(actualizado.body.favorito.description, 'Motor de búsqueda');

    const lista = await request(app).get('/api/favoritos').expect(200);
    assert.equal(lista.body.favoritos.length, 1);

    await request(app).delete(`/api/favoritos/${id}`).expect(204);
    await request(app).get(`/api/favoritos/${id}`).expect(404);
  });
});
