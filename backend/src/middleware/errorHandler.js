import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request',
      details: err.flatten(),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: 'HttpError',
      message: err.message,
      details: err.details ?? null,
    });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong',
  });
}

