const logger = require('../utils/logger');
const config = require('../config');

// Custom error classes
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

// Async handler wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err.message, {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // PostgreSQL errors
  if (err.code === '23505') { // unique_violation
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  if (err.code === '23503') { // foreign_key_violation
    const message = 'Referenced resource not found';
    error = { message, statusCode: 400 };
  }

  if (err.code === '23502') { // not_null_violation
    const message = 'Required field missing';
    error = { message, statusCode: 400 };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    ...(config.app.environment === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

// Validation error handler
const validationErrorHandler = (err, req, res, next) => {
  if (err.isJoi) {
    const errors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/['"]/g, ''),
      value: detail.context.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  next(err);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('content-length')
    });
  });
  
  next();
};

// Error response helper
const sendErrorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

// Success response helper
const sendSuccessResponse = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  requestLogger,
  sendErrorResponse,
  sendSuccessResponse,
  AuthenticationError,
  AuthorizationError,
  ValidationError
}; 