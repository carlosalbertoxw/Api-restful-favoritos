import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { ApiError } from '../utils/ApiError.js';

export function notFound(_req, res) {
  res.status(404).json({ message: 'Recurso no encontrado' });
}

// eslint-disable-next-line no-unused-vars -- Express identifica el manejador de errores por sus 4 argumentos
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: Object.values(err.errors).map((e) => ({
        path: e.path,
        message: e.message,
      })),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'El identificador no es válido' });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Error interno del servidor' });
}
