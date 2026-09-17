import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db.js';

const TEST_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/bookmarks_test';

const app = createApp();

describe('healthchecks con MongoDB', () => {
  before(async () => {
    await connectDatabase(TEST_URI);
  });

  after(async () => {
    // Mongoose crea las colecciones de los modelos al conectar, en segundo plano;
    // se espera a que termine para que no las vuelva a crear tras borrar la base.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
  });

  it('GET /health/ready responde 200 con la base de datos conectada', async () => {
    const res = await request(app).get('/health/ready');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok', checks: { database: 'up' } });
  });

  it('GET /health/ready responde 503 tras desconectar la base de datos', async () => {
    await disconnectDatabase();

    const res = await request(app).get('/health/ready');
    assert.equal(res.status, 503);
    assert.equal(res.body.checks.database, 'down');

    // Reconecta para que after() cierre limpiamente.
    await connectDatabase(TEST_URI);
  });

  it('GET /health sigue respondiendo ok (liveness no depende de MongoDB)', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });
});
