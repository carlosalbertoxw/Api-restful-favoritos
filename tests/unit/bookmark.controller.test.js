import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { ZodError } from 'zod';

import * as controller from '../../src/controllers/bookmark.controller.js';
import { Bookmark } from '../../src/models/bookmark.model.js';
import { ApiError } from '../../src/utils/ApiError.js';
import { createRes } from './helpers.js';

const ID = '64b8f0c2a1b2c3d4e5f60718';
const ejemplo = { title: 'Google', url: 'https://google.com' };
const is404 = (err) => err instanceof ApiError && err.status === 404;

afterEach(() => mock.restoreAll());

describe('listBookmarks', () => {
  const mockFind = () => {
    const query = {
      sort: mock.fn(() => query),
      skip: mock.fn(() => query),
      limit: mock.fn(async () => [ejemplo]),
    };
    mock.method(Bookmark, 'find', () => query);
    return query;
  };

  it('devuelve los marcadores más recientes con el límite por defecto', async () => {
    const query = mockFind();
    const res = createRes();

    await controller.listBookmarks({ query: {} }, res);

    assert.deepEqual(query.sort.mock.calls[0].arguments, ['-createdAt -_id']);
    assert.deepEqual(query.skip.mock.calls[0].arguments, [0]);
    // Pide uno más para saber si hay otra página.
    assert.deepEqual(query.limit.mock.calls[0].arguments, [101]);
    assert.deepEqual(res.body, { bookmarks: [ejemplo], hasMore: false });
  });

  it('indica hasMore y no devuelve el documento extra', async () => {
    const query = mockFind();
    query.limit = mock.fn(async () => [ejemplo, { ...ejemplo, title: 'Extra' }]);
    const res = createRes();

    await controller.listBookmarks({ query: { limit: '1' } }, res);

    assert.deepEqual(res.body, { bookmarks: [ejemplo], hasMore: true });
  });

  it('aplica limit y skip de la petición', async () => {
    const query = mockFind();

    await controller.listBookmarks({ query: { limit: '5', skip: '10' } }, createRes());

    assert.deepEqual(query.skip.mock.calls[0].arguments, [10]);
    assert.deepEqual(query.limit.mock.calls[0].arguments, [6]);
  });

  it('lanza ZodError con un limit inválido sin consultar la base de datos', async () => {
    const find = mock.method(Bookmark, 'find', () => {});
    await assert.rejects(controller.listBookmarks({ query: { limit: '0' } }, createRes()), ZodError);
    assert.equal(find.mock.callCount(), 0);
  });
});

describe('getBookmark', () => {
  it('devuelve el marcador encontrado', async () => {
    const findById = mock.method(Bookmark, 'findById', async () => ejemplo);
    const res = createRes();

    await controller.getBookmark({ params: { id: ID } }, res);

    assert.equal(findById.mock.calls[0].arguments[0], ID);
    assert.deepEqual(res.body, { bookmark: ejemplo });
  });

  it('lanza ApiError 404 si no existe', async () => {
    mock.method(Bookmark, 'findById', async () => null);
    await assert.rejects(controller.getBookmark({ params: { id: ID } }, createRes()), is404);
  });

  it('lanza ZodError con id inválido sin consultar la base de datos', async () => {
    const findById = mock.method(Bookmark, 'findById', async () => ejemplo);
    await assert.rejects(controller.getBookmark({ params: { id: '123' } }, createRes()), ZodError);
    assert.equal(findById.mock.callCount(), 0);
  });
});

describe('createBookmark', () => {
  it('crea el marcador con los datos validados y responde 201', async () => {
    const create = mock.method(Bookmark, 'create', async (data) => ({ id: ID, ...data }));
    const res = createRes();

    await controller.createBookmark({ body: { ...ejemplo, extra: 'x' } }, res);

    assert.deepEqual(create.mock.calls[0].arguments[0], ejemplo);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { bookmark: { id: ID, ...ejemplo } });
  });

  it('no crea nada si los datos son inválidos', async () => {
    const create = mock.method(Bookmark, 'create', async () => ({}));
    await assert.rejects(controller.createBookmark({ body: { title: '' } }, createRes()), ZodError);
    assert.equal(create.mock.callCount(), 0);
  });
});

describe('updateBookmark', () => {
  it('actualiza y devuelve el documento nuevo', async () => {
    const update = mock.method(Bookmark, 'findByIdAndUpdate', async (_id, data) => ({
      ...ejemplo,
      ...data,
    }));
    const res = createRes();

    await controller.updateBookmark({ params: { id: ID }, body: { title: 'Nuevo' } }, res);

    const [id, data, options] = update.mock.calls[0].arguments;
    assert.equal(id, ID);
    assert.deepEqual(data, { title: 'Nuevo' });
    assert.deepEqual(options, { returnDocument: 'after' });
    assert.equal(res.body.bookmark.title, 'Nuevo');
  });

  it('lanza ApiError 404 si no existe', async () => {
    mock.method(Bookmark, 'findByIdAndUpdate', async () => null);
    await assert.rejects(
      controller.updateBookmark({ params: { id: ID }, body: { title: 'Nuevo' } }, createRes()),
      is404,
    );
  });

  it('rechaza un cuerpo vacío sin consultar la base de datos', async () => {
    const update = mock.method(Bookmark, 'findByIdAndUpdate', async () => ejemplo);
    await assert.rejects(
      controller.updateBookmark({ params: { id: ID }, body: {} }, createRes()),
      ZodError,
    );
    assert.equal(update.mock.callCount(), 0);
  });
});

describe('deleteBookmark', () => {
  it('elimina el marcador y responde 204 sin cuerpo', async () => {
    const remove = mock.method(Bookmark, 'findByIdAndDelete', async () => ejemplo);
    const res = createRes();

    await controller.deleteBookmark({ params: { id: ID } }, res);

    assert.equal(remove.mock.calls[0].arguments[0], ID);
    assert.equal(res.statusCode, 204);
    assert.equal(res.body, undefined);
  });

  it('lanza ApiError 404 si no existe', async () => {
    mock.method(Bookmark, 'findByIdAndDelete', async () => null);
    await assert.rejects(controller.deleteBookmark({ params: { id: ID } }, createRes()), is404);
  });
});
