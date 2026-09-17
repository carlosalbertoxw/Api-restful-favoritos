import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createFavoriteSchema,
  objectIdSchema,
  updateFavoriteSchema,
} from '../../src/validation/favorite.schema.js';

const messages = (result) => result.error.issues.map((issue) => issue.message);

describe('createFavoriteSchema', () => {
  it('acepta un marcador válido y recorta espacios', () => {
    const data = createFavoriteSchema.parse({
      title: '  Google  ',
      description: ' Buscador ',
      url: ' https://google.com ',
    });
    assert.deepEqual(data, {
      title: 'Google',
      description: 'Buscador',
      url: 'https://google.com',
    });
  });

  it('permite omitir la descripción', () => {
    const result = createFavoriteSchema.safeParse({ title: 'A', url: 'https://a.com' });
    assert.equal(result.success, true);
  });

  it('elimina campos desconocidos', () => {
    const data = createFavoriteSchema.parse({ title: 'A', url: 'https://a.com', admin: true });
    assert.equal('admin' in data, false);
  });

  it('exige título y url', () => {
    const result = createFavoriteSchema.safeParse({});
    assert.equal(result.success, false);
    const paths = result.error.issues.map((issue) => issue.path.join('.'));
    assert.ok(paths.includes('title'));
    assert.ok(paths.includes('url'));
  });

  it('rechaza un título vacío o solo con espacios', () => {
    const result = createFavoriteSchema.safeParse({ title: '   ', url: 'https://a.com' });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, 'El título es obligatorio');
  });

  it('rechaza un título de más de 200 caracteres', () => {
    const result = createFavoriteSchema.safeParse({ title: 'a'.repeat(201), url: 'https://a.com' });
    assert.equal(result.success, false);
  });

  it('rechaza una descripción de más de 1000 caracteres', () => {
    const result = createFavoriteSchema.safeParse({
      title: 'A',
      url: 'https://a.com',
      description: 'a'.repeat(1001),
    });
    assert.equal(result.success, false);
  });

  it('rechaza una url sin esquema http(s)', () => {
    const result = createFavoriteSchema.safeParse({ title: 'A', url: 'no-es-url' });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, 'La URL debe empezar con http:// o https://');
  });

  it('rechaza una url http(s) que no se puede interpretar', () => {
    const result = createFavoriteSchema.safeParse({ title: 'A', url: 'https://' });
    assert.equal(result.success, false);
    assert.deepEqual(messages(result), ['La URL no es válida']);
  });

  describe('esquemas de URL', () => {
    const permitidas = [
      'https://google.com',
      'http://localhost:8090/agregar-favorito',
      'HTTPS://EJEMPLO.COM/ruta?q=1#ancla',
    ];
    for (const url of permitidas) {
      it(`acepta ${url}`, () => {
        assert.equal(createFavoriteSchema.safeParse({ title: 'A', url }).success, true);
      });
    }

    const rechazadas = [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      '  javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'mailto:alguien@ejemplo.com',
      'ftp://ejemplo.com',
      'http:/ejemplo.com',
      '//ejemplo.com',
    ];
    for (const url of rechazadas) {
      it(`rechaza ${url}`, () => {
        const result = createFavoriteSchema.safeParse({ title: 'A', url });
        assert.equal(result.success, false);
        assert.deepEqual(messages(result), ['La URL debe empezar con http:// o https://']);
      });
    }
  });

  describe('mensajes en español', () => {
    it('indica los campos obligatorios que faltan', () => {
      const result = createFavoriteSchema.safeParse({});
      assert.deepEqual(messages(result), ['El título es obligatorio', 'La URL es obligatoria']);
    });

    it('indica una URL vacía como obligatoria', () => {
      const result = createFavoriteSchema.safeParse({ title: 'A', url: '   ' });
      assert.deepEqual(messages(result), ['La URL es obligatoria']);
    });

    it('indica tipos incorrectos', () => {
      const result = createFavoriteSchema.safeParse({ title: 1, description: 2, url: 3 });
      assert.deepEqual(messages(result), [
        'El título debe ser texto',
        'La descripción debe ser texto',
        'La URL debe ser texto',
      ]);
    });

    it('indica las longitudes máximas', () => {
      const result = createFavoriteSchema.safeParse({
        title: 'a'.repeat(201),
        description: 'a'.repeat(1001),
        url: 'https://a.com',
      });
      assert.deepEqual(messages(result), [
        'El título no puede tener más de 200 caracteres',
        'La descripción no puede tener más de 1000 caracteres',
      ]);
    });

    for (const body of ['hola', null, [], 42]) {
      it(`rechaza un cuerpo que no es objeto: ${JSON.stringify(body)}`, () => {
        assert.deepEqual(messages(createFavoriteSchema.safeParse(body)), [
          'El cuerpo de la petición debe ser un objeto JSON',
        ]);
        assert.deepEqual(messages(updateFavoriteSchema.safeParse(body)), [
          'El cuerpo de la petición debe ser un objeto JSON',
        ]);
      });
    }

    it('no deja mensajes en inglés en ningún caso probado', () => {
      const casos = [{}, 'x', { title: 1, url: 1, description: 1 }, { title: 'a'.repeat(300), url: '' }];
      for (const caso of casos) {
        for (const message of messages(createFavoriteSchema.safeParse(caso))) {
          assert.doesNotMatch(message, /invalid|expected|received|too big|too small/i);
        }
      }
    });
  });
});

describe('updateFavoriteSchema', () => {
  it('acepta una actualización parcial', () => {
    assert.deepEqual(updateFavoriteSchema.parse({ title: 'Nuevo' }), { title: 'Nuevo' });
  });

  it('rechaza un cuerpo vacío', () => {
    const result = updateFavoriteSchema.safeParse({});
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, 'Debes enviar al menos un campo para actualizar');
  });

  it('valida los campos que sí se envían', () => {
    assert.equal(updateFavoriteSchema.safeParse({ url: 'mal' }).success, false);
  });

  it('no permite cambiar la url a un esquema peligroso', () => {
    const result = updateFavoriteSchema.safeParse({ url: 'javascript:alert(1)' });
    assert.equal(result.success, false);
  });
});

describe('objectIdSchema', () => {
  it('responde en español si el id no es texto', () => {
    assert.deepEqual(messages(objectIdSchema.safeParse(123)), ['El identificador no es válido']);
  });

  it('acepta un ObjectId de 24 caracteres hexadecimales', () => {
    assert.equal(objectIdSchema.safeParse('64b8f0c2a1b2c3d4e5f60718').success, true);
    assert.equal(objectIdSchema.safeParse('64B8F0C2A1B2C3D4E5F60718').success, true);
  });

  const invalidos = [
    '123',
    '64b8f0c2a1b2c3d4e5f6071',
    '64b8f0c2a1b2c3d4e5f60718a',
    'zzb8f0c2a1b2c3d4e5f60718',
  ];

  for (const id of invalidos) {
    it(`rechaza "${id}"`, () => {
      assert.equal(objectIdSchema.safeParse(id).success, false);
    });
  }
});
