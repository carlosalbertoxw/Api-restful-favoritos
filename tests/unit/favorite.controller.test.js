import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { ZodError } from 'zod';

import * as controller from '../../src/controllers/favorite.controller.js';
import { Favorite } from '../../src/models/favorite.model.js';
import { ApiError } from '../../src/utils/ApiError.js';
import { createRes } from './helpers.js';

const ID = '64b8f0c2a1b2c3d4e5f60718';
const ejemplo = { title: 'Google', url: 'https://google.com' };
const is404 = (err) => err instanceof ApiError && err.status === 404;

afterEach(() => mock.restoreAll());

describe('getFavoritos', () => {
  it('devuelve los marcadores ordenados por fecha descendente', async () => {
    const sort = mock.fn(async () => [ejemplo]);
    mock.method(Favorite, 'find', () => ({ sort }));
    const res = createRes();

    await controller.getFavoritos({}, res);

    assert.deepEqual(sort.mock.calls[0].arguments, ['-createdAt']);
    assert.deepEqual(res.body, { favoritos: [ejemplo] });
  });
});

describe('getFavorito', () => {
  it('devuelve el marcador encontrado', async () => {
    const findById = mock.method(Favorite, 'findById', async () => ejemplo);
    const res = createRes();

    await controller.getFavorito({ params: { id: ID } }, res);

    assert.equal(findById.mock.calls[0].arguments[0], ID);
    assert.deepEqual(res.body, { favorito: ejemplo });
  });

  it('lanza ApiError 404 si no existe', async () => {
    mock.method(Favorite, 'findById', async () => null);
    await assert.rejects(controller.getFavorito({ params: { id: ID } }, createRes()), is404);
  });

  it('lanza ZodError con id inválido sin consultar la base de datos', async () => {
    const findById = mock.method(Favorite, 'findById', async () => ejemplo);
    await assert.rejects(controller.getFavorito({ params: { id: '123' } }, createRes()), ZodError);
    assert.equal(findById.mock.callCount(), 0);
  });
});

describe('saveFavorito', () => {
  it('crea el marcador con los datos validados y responde 201', async () => {
    const create = mock.method(Favorite, 'create', async (data) => ({ id: ID, ...data }));
    const res = createRes();

    await controller.saveFavorito({ body: { ...ejemplo, extra: 'x' } }, res);

    assert.deepEqual(create.mock.calls[0].arguments[0], ejemplo);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { favorito: { id: ID, ...ejemplo } });
  });

  it('no crea nada si los datos son inválidos', async () => {
    const create = mock.method(Favorite, 'create', async () => ({}));
    await assert.rejects(controller.saveFavorito({ body: { title: '' } }, createRes()), ZodError);
    assert.equal(create.mock.callCount(), 0);
  });
});

describe('updateFavorito', () => {
  it('actualiza con validadores y devuelve el documento nuevo', async () => {
    const update = mock.method(Favorite, 'findByIdAndUpdate', async (_id, data) => ({
      ...ejemplo,
      ...data,
    }));
    const res = createRes();

    await controller.updateFavorito({ params: { id: ID }, body: { title: 'Nuevo' } }, res);

    const [id, data, options] = update.mock.calls[0].arguments;
    assert.equal(id, ID);
    assert.deepEqual(data, { title: 'Nuevo' });
    assert.deepEqual(options, { returnDocument: 'after', runValidators: true });
    assert.equal(res.body.favorito.title, 'Nuevo');
  });

  it('lanza ApiError 404 si no existe', async () => {
    mock.method(Favorite, 'findByIdAndUpdate', async () => null);
    await assert.rejects(
      controller.updateFavorito({ params: { id: ID }, body: { title: 'Nuevo' } }, createRes()),
      is404,
    );
  });

  it('rechaza un cuerpo vacío sin consultar la base de datos', async () => {
    const update = mock.method(Favorite, 'findByIdAndUpdate', async () => ejemplo);
    await assert.rejects(
      controller.updateFavorito({ params: { id: ID }, body: {} }, createRes()),
      ZodError,
    );
    assert.equal(update.mock.callCount(), 0);
  });
});

describe('deleteFavorito', () => {
  it('elimina el marcador', async () => {
    const remove = mock.method(Favorite, 'findByIdAndDelete', async () => ejemplo);
    const res = createRes();

    await controller.deleteFavorito({ params: { id: ID } }, res);

    assert.equal(remove.mock.calls[0].arguments[0], ID);
    assert.deepEqual(res.body, { message: 'El marcador se eliminó exitosamente' });
  });

  it('lanza ApiError 404 si no existe', async () => {
    mock.method(Favorite, 'findByIdAndDelete', async () => null);
    await assert.rejects(controller.deleteFavorito({ params: { id: ID } }, createRes()), is404);
  });
});
