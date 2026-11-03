import { z } from 'zod';

import pkg from '../../package.json' with { type: 'json' };
import {
  createFavoriteSchema,
  listQuerySchema,
  objectIdSchema,
  updateFavoriteSchema,
} from '../validation/favorite.schema.js';

// Las reglas de entrada se generan desde zod para no repetirlas aquí.
function toSchema(schema, io = 'input') {
  const { $schema, ...rest } = z.toJSONSchema(schema, { io });
  return rest;
}

const jsonContent = (schema, extra) => ({ 'application/json': { schema, ...extra } });
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });

const errorResponse = (description, message) => ({
  description,
  content: jsonContent(schemaRef('Error'), { example: { message } }),
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identificador del marcador (ObjectId de 24 caracteres hexadecimales)',
  schema: toSchema(objectIdSchema),
};

const queryParam = (name) => {
  const { description, ...schema } = toSchema(listQuerySchema.shape[name], 'output');
  return { name, in: 'query', description, schema };
};

const bodyErrors = {
  400: responseRef('ValidationError'),
  413: responseRef('PayloadTooLarge'),
  415: responseRef('UnsupportedMediaType'),
};

const idErrors = {
  400: responseRef('ValidationError'),
  404: responseRef('NotFound'),
};

const favoriteResponse = (description) => ({
  description,
  content: jsonContent({ type: 'object', properties: { favorito: schemaRef('Favorite') } }),
});

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'API RESTful de Favoritos',
    version: pkg.version,
    description: 'API para guardar páginas favoritas (marcadores).',
  },
  // Relativo para que "Try it out" funcione en cualquier host y puerto.
  servers: [{ url: '/' }],
  tags: [
    { name: 'Favoritos', description: 'Gestión de marcadores' },
    { name: 'Salud', description: 'Healthchecks del servicio' },
  ],
  components: {
    schemas: {
      Favorite: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6a44b55a0ed255a4001f4cbe' },
          title: { type: 'string', example: 'Anthropic' },
          description: { type: 'string', example: 'Claude' },
          url: { type: 'string', format: 'uri', example: 'https://anthropic.com' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      FavoriteInput: toSchema(createFavoriteSchema),
      FavoriteUpdate: toSchema(updateFavoriteSchema),
      Readiness: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'], example: 'ok' },
          checks: {
            type: 'object',
            properties: {
              database: { type: 'string', enum: ['up', 'down'], example: 'up' },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: { message: { type: 'string', example: 'No existe el marcador' } },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Datos inválidos' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', example: 'url' },
                message: { type: 'string', example: 'La URL debe empezar con http:// o https://' },
              },
            },
          },
        },
      },
    },
    responses: {
      NotFound: errorResponse('El recurso no existe', 'No existe el marcador'),
      ValidationError: {
        description:
          'Datos de entrada inválidos. Si el cuerpo no es JSON válido la respuesta no incluye `errors`.',
        content: jsonContent(schemaRef('ValidationError')),
      },
      PayloadTooLarge: errorResponse(
        'El cuerpo supera el límite de 100 KB',
        'El cuerpo de la petición es demasiado grande',
      ),
      UnsupportedMediaType: errorResponse(
        'Codificación del cuerpo no soportada (charset distinto de UTF-8, etc.)',
        'Codificación de caracteres no soportada',
      ),
    },
  },
  paths: {
    '/api/favoritos': {
      get: {
        tags: ['Favoritos'],
        summary: 'Lista los marcadores, del más reciente al más antiguo',
        parameters: [queryParam('limit'), queryParam('skip')],
        responses: {
          200: {
            description: 'Lista de marcadores',
            content: jsonContent({
              type: 'object',
              properties: { favoritos: { type: 'array', items: schemaRef('Favorite') } },
            }),
          },
          400: responseRef('ValidationError'),
        },
      },
      post: {
        tags: ['Favoritos'],
        summary: 'Crea un marcador',
        requestBody: { required: true, content: jsonContent(schemaRef('FavoriteInput')) },
        responses: { 201: favoriteResponse('Marcador creado'), ...bodyErrors },
      },
    },
    '/api/favoritos/{id}': {
      get: {
        tags: ['Favoritos'],
        summary: 'Obtiene un marcador por su id',
        parameters: [idParam],
        responses: { 200: favoriteResponse('Marcador encontrado'), ...idErrors },
      },
      patch: {
        tags: ['Favoritos'],
        summary: 'Actualiza los campos enviados de un marcador',
        parameters: [idParam],
        requestBody: { required: true, content: jsonContent(schemaRef('FavoriteUpdate')) },
        responses: { 200: favoriteResponse('Marcador actualizado'), ...bodyErrors, ...idErrors },
      },
      delete: {
        tags: ['Favoritos'],
        summary: 'Elimina un marcador',
        parameters: [idParam],
        responses: { 204: { description: 'Marcador eliminado' }, ...idErrors },
      },
    },
    '/health': {
      get: {
        tags: ['Salud'],
        summary: 'Liveness: el proceso está vivo',
        description: 'No consulta dependencias externas. Úsalo para saber si hay que reiniciar el proceso.',
        responses: {
          200: {
            description: 'El proceso está operativo',
            content: jsonContent({
              type: 'object',
              properties: { status: { type: 'string', example: 'ok' } },
            }),
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Salud'],
        summary: 'Readiness: el servicio puede atender tráfico',
        description: 'Hace ping a MongoDB (máximo 2 s). Úsalo para decidir si enviar tráfico al servicio.',
        responses: {
          200: {
            description: 'Todas las dependencias están disponibles',
            content: jsonContent(schemaRef('Readiness')),
          },
          503: {
            description: 'Alguna dependencia no está disponible',
            content: jsonContent(schemaRef('Readiness'), {
              example: { status: 'error', checks: { database: 'down' } },
            }),
          },
        },
      },
    },
  },
};
