const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create different rate limiters for different endpoints
const rateLimiters = {
  // Authentication rate limiter (stricter)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for auth from IP: ${req.ip}`, {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60
      });
    }
  }),

  // API rate limiter (moderate)
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many API requests, please try again later.',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for API from IP: ${req.ip}`, {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many API requests, please try again later.',
        retryAfter: 15 * 60
      });
    }
  }),

  // Upload rate limiter (very strict)
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 uploads per hour
    message: {
      error: 'Too many upload attempts, please try again later.',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Password reset rate limiter
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // General rate limiter (lenient)
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  })
};

// Add rate limit headers to response
const addRateLimitHeaders = (req, res, next) => {
  // This middleware can be used to add custom rate limit headers
  next();
};

module.exports = {
  rateLimiters,
  addRateLimitHeaders
}; 