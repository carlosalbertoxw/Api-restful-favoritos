import { config } from '../config.js';

const favoriteProperties = {
  id: { type: 'string', example: '6a44b55a0ed255a4001f4cbe' },
  title: { type: 'string', example: 'Anthropic' },
  description: { type: 'string', example: 'Claude' },
  url: { type: 'string', format: 'uri', example: 'https://anthropic.com' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identificador del marcador (ObjectId de 24 caracteres hexadecimales)',
  schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
};

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'API RESTful de Favoritos',
    version: '2.0.0',
    description: 'API para guardar páginas favoritas (marcadores).',
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Servidor local' }],
  tags: [{ name: 'Favoritos', description: 'Gestión de marcadores' }],
  components: {
    schemas: {
      Favorite: {
        type: 'object',
        properties: favoriteProperties,
      },
      FavoriteInput: {
        type: 'object',
        required: ['title', 'url'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200, example: 'Anthropic' },
          description: { type: 'string', maxLength: 1000, example: 'Claude' },
          url: { type: 'string', format: 'uri', example: 'https://anthropic.com' },
        },
      },
      FavoriteUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          url: { type: 'string', format: 'uri' },
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
                message: { type: 'string', example: 'La URL no es válida' },
              },
            },
          },
        },
      },
    },
    responses: {
      NotFound: {
        description: 'El recurso no existe',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description: 'Datos de entrada inválidos',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } },
        },
      },
    },
  },
  paths: {
    '/api/favoritos': {
      get: {
        tags: ['Favoritos'],
        summary: 'Lista todos los marcadores',
        responses: {
          200: {
            description: 'Lista de marcadores',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    favoritos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Favorite' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/favorito': {
      post: {
        tags: ['Favoritos'],
        summary: 'Crea un marcador',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FavoriteInput' } },
          },
        },
        responses: {
          201: {
            description: 'Marcador creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { favorito: { $ref: '#/components/schemas/Favorite' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/favorito/{id}': {
      get: {
        tags: ['Favoritos'],
        summary: 'Obtiene un marcador por su id',
        parameters: [idParam],
        responses: {
          200: {
            description: 'Marcador encontrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { favorito: { $ref: '#/components/schemas/Favorite' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Favoritos'],
        summary: 'Actualiza un marcador',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FavoriteUpdate' } },
          },
        },
        responses: {
          200: {
            description: 'Marcador actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { favorito: { $ref: '#/components/schemas/Favorite' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Favoritos'],
        summary: 'Elimina un marcador',
        parameters: [idParam],
        responses: {
          200: {
            description: 'Marcador eliminado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'El marcador se eliminó exitosamente',
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Healthcheck del servicio',
        responses: {
          200: {
            description: 'El servicio está operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
  },
};
