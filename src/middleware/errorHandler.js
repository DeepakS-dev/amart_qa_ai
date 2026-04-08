import { AppError } from '../utils/AppError.js';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function mongooseValidationErrors(err) {
  if (!err.errors || typeof err.errors !== 'object') return undefined;
  return Object.fromEntries(
    Object.entries(err.errors).map(([key, e]) => [key, e.message])
  );
}

/**
 * Central error middleware. Must be registered last among middleware.
 * Production: short messages, no stack traces.
 */
export function errorHandler(err, _req, res, _next) {
  if (res.headersSent) {
    return _next(err);
  }

  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'This resource already exists';
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    statusCode = 400;
    message = 'Invalid request body';
  } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
    message = isProduction() ? 'Request could not be completed' : err.message;
  } else if (
    typeof err.statusCode === 'number' &&
    err.statusCode >= 400 &&
    err.statusCode < 600
  ) {
    statusCode = err.statusCode;
    message =
      isProduction() && err.statusCode >= 500
        ? 'Internal server error'
        : err.message || message;
  }

  if (isProduction() && statusCode >= 500 && !(err instanceof AppError)) {
    message = 'Internal server error';
  }

  const body = {
    success: false,
    message,
  };

  if (!isProduction()) {
    if (statusCode >= 500) {
      body.stack = err.stack;
    }
    if (err.name === 'ValidationError' && err.errors) {
      const details = mongooseValidationErrors(err);
      if (details) body.errors = details;
    }
  }

  res.status(statusCode).json(body);
}
