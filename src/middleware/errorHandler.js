import { ZodError } from 'zod';

import { ApiError } from '../utils/ApiError.js';

// Errores de express.json() (body-parser), identificados por `type`.
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'El cuerpo de la petición no es un JSON válido',
  'entity.too.large': 'El cuerpo de la petición es demasiado grande',
  'charset.unsupported': 'Codificación de caracteres no soportada',
  'encoding.unsupported': 'Codificación de contenido no soportada',
};

export function notFound(_req, res) {
  res.status(404).json({ message: 'Recurso no encontrado' });
}

// Express identifica el manejador de errores por sus 4 argumentos.
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

  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  // Errores HTTP del cliente marcados como seguros de mostrar (http-errors).
  if (err.expose && err.status >= 400 && err.status < 500) {
    const message = BODY_PARSER_MESSAGES[err.type] ?? 'Petición inválida';
    return res.status(err.status).json({ message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Error interno del servidor' });
}
