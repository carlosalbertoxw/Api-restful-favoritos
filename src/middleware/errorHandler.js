import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { ApiError } from '../utils/ApiError.js';

// Errores de express.json()/urlencoded() (body-parser), identificados por `type`.
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'El cuerpo de la petición no es un JSON válido',
  'entity.too.large': 'El cuerpo de la petición es demasiado grande',
  'entity.verify.failed': 'El cuerpo de la petición no es válido',
  'request.aborted': 'La petición fue interrumpida',
  'request.size.invalid': 'El tamaño del cuerpo no coincide con Content-Length',
  'stream.encoding.set': 'El cuerpo de la petición no es válido',
  'stream.not.readable': 'El cuerpo de la petición no es válido',
  'charset.unsupported': 'Codificación de caracteres no soportada',
  'encoding.unsupported': 'Codificación de contenido no soportada',
  'parameters.too.many': 'Demasiados parámetros en el cuerpo de la petición',
};

// Errores HTTP del cliente (4xx) marcados como seguros de mostrar (http-errors).
function isClientHttpError(err) {
  const status = err?.status ?? err?.statusCode;
  return err?.expose === true && Number.isInteger(status) && status >= 400 && status < 500;
}

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

  if (isClientHttpError(err)) {
    const status = err.status ?? err.statusCode;
    const message = BODY_PARSER_MESSAGES[err.type] ?? 'Petición inválida';
    return res.status(status).json({ message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Error interno del servidor' });
}
