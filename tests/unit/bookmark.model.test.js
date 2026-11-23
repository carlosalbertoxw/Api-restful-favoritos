import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import mongoose from 'mongoose';

import { Bookmark } from '../../src/models/bookmark.model.js';

// validate() no necesita conexión: solo aplica las reglas del esquema.
const validationError = (doc) => doc.validate().then(() => undefined, (err) => err);

describe('Bookmark model', () => {
  it('exige title y url', async () => {
    const error = await validationError(new Bookmark({}));
    assert.ok(error instanceof mongoose.Error.ValidationError);
    assert.ok(error.errors.title);
    assert.ok(error.errors.url);
  });

  it('pone descripción vacía por defecto', async () => {
    const bookmark = new Bookmark({ title: 'Google', url: 'https://google.com' });
    assert.equal(await validationError(bookmark), undefined);
    assert.equal(bookmark.description, '');
  });

  it('serializa id como texto en lugar de _id y sin versionKey', () => {
    const bookmark = new Bookmark({ title: 'A', url: 'https://a.com' });
    const json = bookmark.toJSON();
    assert.equal(json.id, bookmark.id);
    assert.equal(typeof json.id, 'string');
    assert.equal(json._id, undefined);
    assert.equal(json.__v, undefined);
  });
});
