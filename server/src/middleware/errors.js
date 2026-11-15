import { ZodError } from 'zod';
import { AppError } from '../utils/http.js';

export const notFound = (req, _res, next) => next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} was not found.`));
export const errorHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details: error.flatten() } });
  const status = error.status || 500;
  if (status >= 500) req.log?.error({ err: error }, 'request failed');
  res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? 'An unexpected error occurred.' : error.message, ...(error.details && { details: error.details }) } });
};
