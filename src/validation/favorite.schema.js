import { z } from 'zod';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 1000;
const LIST_LIMIT_MAX = 100;

// Solo se aceptan enlaces http(s): otros esquemas (javascript:, data:, file:...)
// permitirían XSS u otros abusos en los clientes que muestren el enlace. Sin la
// bandera `i` porque el patrón también se publica en OpenAPI, que no admite banderas.
const HTTP_URL_REGEX = /^[Hh][Tt][Tt][Pp][Ss]?:\/\//;

const LIMIT_ERROR = `limit debe ser un entero entre 1 y ${LIST_LIMIT_MAX}`;
const SKIP_ERROR = 'skip debe ser un entero mayor o igual a 0';

const requiredString = (field, requiredMessage) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMessage : `${field} debe ser texto`),
  });

export const createFavoriteSchema = z.object(
  {
    title: requiredString('El título', 'El título es obligatorio')
      .trim()
      .min(1, 'El título es obligatorio')
      .max(TITLE_MAX, `El título no puede tener más de ${TITLE_MAX} caracteres`)
      .meta({ example: 'Anthropic' }),
    description: z
      .string({ error: 'La descripción debe ser texto' })
      .trim()
      .max(DESCRIPTION_MAX, `La descripción no puede tener más de ${DESCRIPTION_MAX} caracteres`)
      .meta({ example: 'Claude' })
      .optional(),
    url: requiredString('La URL', 'La URL es obligatoria')
      .trim()
      .min(1, { error: 'La URL es obligatoria', abort: true })
      .regex(HTTP_URL_REGEX, 'La URL debe empezar con http:// o https://')
      .pipe(z.url({ protocol: /^https?$/, error: 'La URL no es válida' }))
      .meta({
        format: 'uri',
        description: 'Solo se aceptan URLs http:// o https://',
        example: 'https://anthropic.com',
      }),
  },
  { error: 'El cuerpo de la petición debe ser un objeto JSON' },
);

export const updateFavoriteSchema = createFavoriteSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  })
  .meta({ minProperties: 1 });

export const objectIdSchema = z
  .string({ error: 'El identificador no es válido' })
  .regex(/^[0-9a-fA-F]{24}$/, 'El identificador no es válido');

export const listQuerySchema = z.object({
  limit: z.coerce
    .number({ error: LIMIT_ERROR })
    .int(LIMIT_ERROR)
    .min(1, LIMIT_ERROR)
    .max(LIST_LIMIT_MAX, LIMIT_ERROR)
    .default(LIST_LIMIT_MAX)
    .meta({ description: 'Cantidad máxima de marcadores a devolver' }),
  skip: z.coerce
    .number({ error: SKIP_ERROR })
    .int(SKIP_ERROR)
    .min(0, SKIP_ERROR)
    .default(0)
    .meta({ description: 'Cantidad de marcadores a omitir' }),
});
