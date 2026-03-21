const logger = require('../utils/logger');

/**
 * Custom error class for API errors with status codes
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware for handling 404 Not Found errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Special handling for JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    // Log JSON parsing error with simplified body to avoid circular references
    logger.error({
      message: 'JSON parsing error',
      error: err.message,
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      user: req.user ? req.user._id : 'unauthenticated'
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Log error details for other error types
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user ? req.user._id : 'unauthenticated'
  });

  // Determine if this is a trusted error (our own ApiError)
  const statusCode = err.statusCode || 500;

  // Sanitize error message in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler,
  ApiError
};
