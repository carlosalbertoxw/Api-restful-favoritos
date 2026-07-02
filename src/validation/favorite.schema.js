import { z } from 'zod';

export const createFavoriteSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  description: z.string().trim().max(1000).optional(),
  url: z.string().trim().url('La URL no es válida'),
});

export const updateFavoriteSchema = createFavoriteSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'El identificador no es válido');
