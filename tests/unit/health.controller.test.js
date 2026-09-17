import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import mongoose from 'mongoose';

import { checkDatabase, liveness, readiness } from '../../src/controllers/health.controller.js';
import { createRes } from './helpers.js';

const { connection } = mongoose;
const { connected, disconnected } = mongoose.ConnectionStates;

// Sobrescribe readyState y db en la instancia (en el prototipo son getters)
// sin abrir una conexión real.
function fakeConnection({ readyState, ping }) {
  Object.defineProperty(connection, 'readyState', { value: readyState, configurable: true });
  Object.defineProperty(connection, 'db', {
    value: { admin: () => ({ ping }) },
    configurable: true,
  });
}

afterEach(() => {
  delete connection.readyState;
  delete connection.db;
});

function createHealthRes() {
  const res = createRes();
  res.headers = {};
  res.set = function set(name, value) {
    this.headers[name] = value;
    return this;
  };
  return res;
}

describe('checkDatabase', () => {
  it('devuelve false si no hay conexión, sin hacer ping', async () => {
    let pinged = false;
    fakeConnection({ readyState: disconnected, ping: async () => (pinged = true) });
    assert.equal(await checkDatabase(), false);
    assert.equal(pinged, false);
  });

  it('devuelve true si la conexión responde al ping', async () => {
    fakeConnection({ readyState: connected, ping: async () => ({ ok: 1 }) });
    assert.equal(await checkDatabase(), true);
  });

  it('devuelve false si el ping falla', async () => {
    fakeConnection({
      readyState: connected,
      ping: async () => {
        throw new Error('conexión perdida');
      },
    });
    assert.equal(await checkDatabase(), false);
  });

  it('devuelve false si el ping excede el tiempo límite', async () => {
    fakeConnection({ readyState: connected, ping: () => new Promise(() => {}) });
    const inicio = Date.now();
    assert.equal(await checkDatabase({ timeoutMs: 50 }), false);
    assert.ok(Date.now() - inicio < 1000);
  });
});

describe('liveness', () => {
  it('responde ok sin caché', () => {
    const res = createHealthRes();
    liveness({}, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status: 'ok' });
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });
});

describe('readiness', () => {
  it('responde 200 si la base de datos está disponible', async () => {
    fakeConnection({ readyState: connected, ping: async () => ({ ok: 1 }) });
    const res = createHealthRes();

    await readiness({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status: 'ok', checks: { database: 'up' } });
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });

  it('responde 503 si la base de datos no está disponible', async () => {
    fakeConnection({ readyState: disconnected, ping: async () => ({ ok: 1 }) });
    const res = createHealthRes();

    await readiness({}, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { status: 'error', checks: { database: 'down' } });
  });
});
