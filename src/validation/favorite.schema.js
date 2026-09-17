import { z } from 'zod';

// Mensajes de zod en español para cualquier error sin mensaje propio.
z.config(z.locales.es());

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 1000;

// Solo se aceptan enlaces http(s): otros esquemas (javascript:, data:, file:...)
// permitirían XSS u otros abusos en los clientes que muestren el enlace.
export const HTTP_URL_REGEX = /^https?:\/\//i;

const requiredString = (field, requiredMessage) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMessage : `${field} debe ser texto`),
  });

export const createFavoriteSchema = z.object(
  {
    title: requiredString('El título', 'El título es obligatorio')
      .trim()
      .min(1, 'El título es obligatorio')
      .max(TITLE_MAX, `El título no puede tener más de ${TITLE_MAX} caracteres`),
    description: z
      .string({ error: 'La descripción debe ser texto' })
      .trim()
      .max(DESCRIPTION_MAX, `La descripción no puede tener más de ${DESCRIPTION_MAX} caracteres`)
      .optional(),
    url: requiredString('La URL', 'La URL es obligatoria')
      .trim()
      .min(1, { error: 'La URL es obligatoria', abort: true })
      .regex(HTTP_URL_REGEX, 'La URL debe empezar con http:// o https://')
      .pipe(z.url({ protocol: /^https?$/, error: 'La URL no es válida' })),
  },
  { error: 'El cuerpo de la petición debe ser un objeto JSON' },
);

export const updateFavoriteSchema = createFavoriteSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

export const objectIdSchema = z
  .string({ error: 'El identificador no es válido' })
  .regex(/^[0-9a-fA-F]{24}$/, 'El identificador no es válido');
