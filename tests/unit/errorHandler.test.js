import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import mongoose from 'mongoose';
import { z } from 'zod';

import { errorHandler, notFound } from '../../src/middleware/errorHandler.js';
import { ApiError } from '../../src/utils/ApiError.js';
import { createRes } from './helpers.js';

describe('notFound', () => {
  it('responde 404', () => {
    const res = createRes();
    notFound({}, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'Recurso no encontrado' });
  });
});

describe('errorHandler', () => {
  it('convierte un ZodError en 400 con el detalle', () => {
    const { error } = z.object({ user: z.object({ name: z.string() }) }).safeParse({ user: {} });
    const res = createRes();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Datos inválidos');
    assert.equal(res.body.errors[0].path, 'user.name');
  });

  it('convierte un ValidationError de mongoose en 400', async () => {
    const Model = mongoose.model(
      'ErrorHandlerTest',
      new mongoose.Schema({ title: { type: String, required: true } }),
    );
    const error = await new Model({}).validate().catch((err) => err);
    const res = createRes();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Datos inválidos');
    assert.equal(res.body.errors[0].path, 'title');
  });

  it('convierte un CastError de mongoose en 400', () => {
    const error = new mongoose.Error.CastError('ObjectId', 'abc', '_id');
    const res = createRes();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: 'El identificador no es válido' });
  });

  it('usa el status y el mensaje de un ApiError', () => {
    const res = createRes();
    errorHandler(new ApiError(404, 'No existe el marcador'), {}, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'No existe el marcador' });
  });

  const bodyParserCases = [
    ['entity.parse.failed', 400, 'El cuerpo de la petición no es un JSON válido'],
    ['entity.too.large', 413, 'El cuerpo de la petición es demasiado grande'],
    ['charset.unsupported', 415, 'Codificación de caracteres no soportada'],
    ['encoding.unsupported', 415, 'Codificación de contenido no soportada'],
  ];

  for (const [type, status, message] of bodyParserCases) {
    it(`convierte el error "${type}" de body-parser en ${status}`, (t) => {
      const consoleError = t.mock.method(console, 'error', () => {});
      const error = Object.assign(new Error('detalle interno'), { type, status, expose: true });
      const res = createRes();

      errorHandler(error, {}, res, () => {});

      assert.equal(res.statusCode, status);
      assert.deepEqual(res.body, { message });
      assert.equal(consoleError.mock.callCount(), 0);
    });
  }

  it('usa un mensaje genérico para otros errores 4xx expuestos', () => {
    const error = Object.assign(new Error('x'), { statusCode: 422, expose: true });
    const res = createRes();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.body, { message: 'Petición inválida' });
  });

  it('no expone errores 5xx aunque traigan status', (t) => {
    t.mock.method(console, 'error', () => {});
    const error = Object.assign(new Error('fallo'), { status: 503, expose: true });
    const res = createRes();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: 'Error interno del servidor' });
  });

  it('no expone errores 4xx no marcados como expose', (t) => {
    t.mock.method(console, 'error', () => {});
    const error = Object.assign(new Error('fallo'), { status: 400 });
    const res = createRes();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 500);
  });

  it('responde 500 sin filtrar detalles ante errores inesperados', (t) => {
    const consoleError = t.mock.method(console, 'error', () => {});
    const res = createRes();
    errorHandler(new Error('secreto interno'), {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: 'Error interno del servidor' });
    assert.equal(consoleError.mock.callCount(), 1);
  });
});

describe('ApiError', () => {
  it('es un Error con status', () => {
    const error = new ApiError(418, 'Soy una tetera');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'ApiError');
    assert.equal(error.status, 418);
    assert.equal(error.message, 'Soy una tetera');
  });
});
