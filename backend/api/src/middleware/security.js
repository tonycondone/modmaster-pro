const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');

/**
 * Comprehensive security middleware configuration
 */
const securityMiddleware = {
  /**
   * Configure Helmet security headers
   */
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.modmasterpro.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }),

  /**
   * Rate limiting configuration
   */
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
      // Use X-Forwarded-For header if behind proxy, otherwise use IP
      return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    },
  }),

  /**
   * Slow down requests to prevent brute force attacks
   */
  speedLimiter: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 50
    maxDelayMs: 20000, // max delay of 20 seconds
  }),

  /**
   * HTTP Parameter Pollution protection
   */
  hpp: hpp({
    whitelist: ['filter', 'sort', 'page', 'limit'], // Allow these parameters to be duplicated
  }),

  /**
   * XSS protection
   */
  xss: xss(),

  /**
   * MongoDB injection protection
   */
  mongoSanitize: mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized MongoDB injection attempt: ${key}`);
    },
  }),

  /**
   * Custom input sanitization middleware
   */
  sanitizeInput: (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = validator.escape(req.query[key]);
        }
      });
    }

    // Sanitize body parameters
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = validator.escape(req.body[key]);
        }
      });
    }

    // Sanitize URL parameters
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = validator.escape(req.params[key]);
        }
      });
    }

    next();
  },

  /**
   * SQL injection protection middleware
   */
  sqlInjectionProtection: (req, res, next) => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*--)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*#)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*\/\*)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*\*\/)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*;)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*\/)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+\s*\\\\)/i,
    ];

    const checkForSQLInjection = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          for (const pattern of sqlPatterns) {
            if (pattern.test(obj[key])) {
              return true;
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkForSQLInjection(obj[key])) {
            return true;
          }
        }
      }
      return false;
    };

    if (checkForSQLInjection(req.query) || checkForSQLInjection(req.body) || checkForSQLInjection(req.params)) {
      return res.status(400).json({
        error: 'Potential SQL injection detected',
        code: 'SQL_INJECTION_DETECTED',
      });
    }

    next();
  },

  /**
   * File upload security middleware
   */
  fileUploadSecurity: (req, res, next) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
    ];

    const maxFileSize = 5 * 1024 * 1024; // 5MB

    if (req.files) {
      for (const file of Object.values(req.files)) {
        if (Array.isArray(file)) {
          for (const f of file) {
            if (!allowedMimeTypes.includes(f.mimetype)) {
              return res.status(400).json({
                error: 'Invalid file type',
                code: 'INVALID_FILE_TYPE',
              });
            }
            if (f.size > maxFileSize) {
              return res.status(400).json({
                error: 'File too large',
                code: 'FILE_TOO_LARGE',
              });
            }
          }
        } else {
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
              error: 'Invalid file type',
              code: 'INVALID_FILE_TYPE',
            });
          }
          if (file.size > maxFileSize) {
            return res.status(400).json({
              error: 'File too large',
              code: 'FILE_TOO_LARGE',
            });
          }
        }
      }
    }

    next();
  },

  /**
   * CORS configuration
   */
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  },

  /**
   * Request size limiting
   */
  requestSizeLimit: {
    limit: '10mb',
    message: {
      error: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE',
    },
  },
};

module.exports = securityMiddleware;