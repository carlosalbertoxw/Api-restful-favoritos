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
  tags: [
    { name: 'Favoritos', description: 'Gestión de marcadores' },
    { name: 'Salud', description: 'Healthchecks del servicio' },
  ],
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
          url: {
            type: 'string',
            format: 'uri',
            pattern: '^[Hh][Tt][Tt][Pp][Ss]?://',
            description: 'Solo se aceptan URLs http:// o https://',
            example: 'https://anthropic.com',
          },
        },
      },
      FavoriteUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          url: {
            type: 'string',
            format: 'uri',
            pattern: '^[Hh][Tt][Tt][Pp][Ss]?://',
            description: 'Solo se aceptan URLs http:// o https://',
          },
        },
      },
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
      NotFound: {
        description: 'El recurso no existe',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description:
          'Datos de entrada inválidos. Si el cuerpo no es JSON válido la respuesta no incluye `errors`.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ValidationError' },
            examples: {
              validacion: {
                summary: 'Datos que no cumplen las reglas',
                value: {
                  message: 'Datos inválidos',
                  errors: [{ path: 'url', message: 'La URL debe empezar con http:// o https://' }],
                },
              },
              jsonMalformado: {
                summary: 'Cuerpo que no es JSON válido',
                value: { message: 'El cuerpo de la petición no es un JSON válido' },
              },
            },
          },
        },
      },
      PayloadTooLarge: {
        description: 'El cuerpo supera el límite de 100 KB',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'El cuerpo de la petición es demasiado grande' },
          },
        },
      },
      UnsupportedMediaType: {
        description: 'Codificación del cuerpo no soportada (charset distinto de UTF-8, etc.)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Codificación de caracteres no soportada' },
          },
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
          413: { $ref: '#/components/responses/PayloadTooLarge' },
          415: { $ref: '#/components/responses/UnsupportedMediaType' },
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
          413: { $ref: '#/components/responses/PayloadTooLarge' },
          415: { $ref: '#/components/responses/UnsupportedMediaType' },
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
        tags: ['Salud'],
        summary: 'Liveness: el proceso está vivo',
        description: 'No consulta dependencias externas. Úsalo para saber si hay que reiniciar el proceso.',
        responses: {
          200: {
            description: 'El proceso está operativo',
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
    '/health/ready': {
      get: {
        tags: ['Salud'],
        summary: 'Readiness: el servicio puede atender tráfico',
        description: 'Hace ping a MongoDB (máximo 2 s). Úsalo para decidir si enviar tráfico al servicio.',
        responses: {
          200: {
            description: 'Todas las dependencias están disponibles',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Readiness' },
              },
            },
          },
          503: {
            description: 'Alguna dependencia no está disponible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Readiness' },
                example: { status: 'error', checks: { database: 'down' } },
              },
            },
          },
        },
      },
    },
  },
};
