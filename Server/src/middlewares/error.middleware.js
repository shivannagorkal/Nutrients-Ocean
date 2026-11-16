export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.errorCode || err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || undefined;

  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    code = 'UNIQUE_CONSTRAINT_VIOLATION';
    message = err.detail || 'Unique constraint violation';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = err.detail || 'Referenced record does not exist';
  }

  if (process.env.NODE_ENV !== 'test' && statusCode === 500) {
    console.error('Internal Server Error:', err);
    // Generic error message to clients in production per Section 11
    if (process.env.NODE_ENV === 'production') {
      message = 'An unexpected server error occurred';
    }
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
