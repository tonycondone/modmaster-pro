const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const sanitizeHtml = require('sanitize-html');
const xss = require('xss');

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a schema
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: errors.array(),
        body: req.body,
        userId: req.user?.id
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    next();
  };
};

/**
 * Joi validation middleware
 * Validates request data against a Joi schema
 */
const validateJoi = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      logger.warn('Joi validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details,
        data: req[property],
        userId: req.user?.id
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }))
      });
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Sanitize input data to prevent XSS and injection attacks
 * @param {*} data - Data to sanitize
 * @returns {*} Sanitized data
 */
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    // Remove HTML tags and sanitize
    return xss(sanitizeHtml(data, {
      allowedTags: [],
      allowedAttributes: {}
    }));
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Middleware to sanitize all input
 */
const sanitizeAll = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  // Sanitize query params
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  
  // Sanitize params
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';

  // Validate ranges
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be greater than 0'
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }

  if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Sort order must be asc or desc'
    });
  }

  // Add to request
  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder: sortOrder.toUpperCase()
  };

  next();
};

/**
 * Validate file upload
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = true
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    if (!req.file && !required) {
      return next();
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size must not exceed ${maxSize / (1024 * 1024)}MB`
      });
    }

    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Custom validators
 */
const customValidators = {
  /**
   * Validate VIN (Vehicle Identification Number)
   */
  isVIN: (value) => {
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinRegex.test(value)) {
      throw new Error('Invalid VIN format');
    }
    return true;
  },

  /**
   * Validate phone number
   */
  isPhoneNumber: (value) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number format');
    }
    return true;
  },

  /**
   * Validate password strength
   */
  isStrongPassword: (value) => {
    if (value.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(value)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(value)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(value)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      throw new Error('Password must contain at least one special character');
    }
    return true;
  },

  /**
   * Validate year (for vehicles)
   */
  isValidYear: (value) => {
    const year = parseInt(value);
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      throw new Error('Invalid year');
    }
    return true;
  },

  /**
   * Validate price
   */
  isValidPrice: (value) => {
    const price = parseFloat(value);
    if (isNaN(price) || price < 0 || price > 1000000) {
      throw new Error('Invalid price');
    }
    return true;
  },

  /**
   * Validate coordinates
   */
  isValidCoordinates: (value) => {
    const { lat, lng } = value;
    if (lat < -90 || lat > 90) {
      throw new Error('Invalid latitude');
    }
    if (lng < -180 || lng > 180) {
      throw new Error('Invalid longitude');
    }
    return true;
  }
};

module.exports = {
  validate,
  validateJoi,
  sanitizeInput,
  sanitizeAll,
  validatePagination,
  validateFileUpload,
  customValidators
};