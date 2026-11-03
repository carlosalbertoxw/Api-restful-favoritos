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

  it('pone descripción vacía por defecto', async () => {
    const favorito = new Favorite({ title: 'Google', url: 'https://google.com' });
    assert.equal(await validationError(favorito), undefined);
    assert.equal(favorito.description, '');
  });

  it('serializa id como texto en lugar de _id y sin versionKey', () => {
    const favorito = new Favorite({ title: 'A', url: 'https://a.com' });
    const json = favorito.toJSON();
    assert.equal(json.id, favorito.id);
    assert.equal(typeof json.id, 'string');
    assert.equal(json._id, undefined);
    assert.equal(json.__v, undefined);
  });
});
