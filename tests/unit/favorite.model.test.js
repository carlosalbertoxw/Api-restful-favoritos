import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import mongoose from 'mongoose';

import { Favorite } from '../../src/models/favorite.model.js';

// validate() no necesita conexión: solo aplica las reglas del esquema.
const validationError = (doc) => doc.validate().then(() => undefined, (err) => err);

describe('Favorite model', () => {
  it('exige title y url', async () => {
    const error = await validationError(new Favorite({}));
    assert.ok(error instanceof mongoose.Error.ValidationError);
    assert.ok(error.errors.title);
    assert.ok(error.errors.url);
  });

  it('recorta espacios y pone descripción vacía por defecto', async () => {
    const favorito = new Favorite({ title: '  Google ', url: ' https://google.com ' });
    assert.equal(await validationError(favorito), undefined);
    assert.equal(favorito.title, 'Google');
    assert.equal(favorito.url, 'https://google.com');
    assert.equal(favorito.description, '');
  });

  it('limita la longitud de title y description', async () => {
    const error = await validationError(
      new Favorite({
        title: 'a'.repeat(201),
        description: 'a'.repeat(1001),
        url: 'https://a.com',
      }),
    );
    assert.ok(error.errors.title);
    assert.ok(error.errors.description);
  });

  it('usa mensajes en español', async () => {
    const error = await validationError(new Favorite({ title: 'a'.repeat(201) }));
    assert.equal(error.errors.title.message, 'El título no puede tener más de 200 caracteres');
    assert.equal(error.errors.url.message, 'La URL es obligatoria');
  });

  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.com']) {
    it(`no guarda una url que no sea http(s): ${url}`, async () => {
      const error = await validationError(new Favorite({ title: 'A', url }));
      assert.equal(error.errors.url.message, 'La URL debe empezar con http:// o https://');
    });
  }

  it('acepta urls http y https', async () => {
    assert.equal(await validationError(new Favorite({ title: 'A', url: 'http://a.com' })), undefined);
    assert.equal(await validationError(new Favorite({ title: 'A', url: 'HTTPS://A.COM' })), undefined);
  });

  it('serializa id en lugar de _id y sin versionKey', () => {
    const favorito = new Favorite({ title: 'A', url: 'https://a.com' });
    const json = favorito.toJSON();
    assert.equal(String(json.id), favorito.id);
    assert.equal(json._id, undefined);
    assert.equal(json.__v, undefined);
  });
});
