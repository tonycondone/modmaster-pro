const { validationResult, body, param, query } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};

// Common validation rules
const commonValidations = {
  // ID validations
  uuid: (field) => {
    return param(field)
      .isUUID()
      .withMessage(`${field} must be a valid UUID`);
  },
  
  // String validations
  requiredString: (field, minLength = 1, maxLength = 255) => {
    return body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} is required`)
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`);
  },
  
  optionalString: (field, minLength = 1, maxLength = 255) => {
    return body(field)
      .optional()
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`);
  },
  
  // Email validation
  email: (field = 'email') => {
    return body(field)
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail()
      .toLowerCase();
  },
  
  // Password validation
  password: (field = 'password') => {
    return body(field)
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character');
  },
  
  // Number validations
  requiredNumber: (field, min, max) => {
    let validation = body(field)
      .notEmpty()
      .withMessage(`${field} is required`)
      .isNumeric()
      .withMessage(`${field} must be a number`);
    
    if (min !== undefined) {
      validation = validation.isFloat({ min }).withMessage(`${field} must be at least ${min}`);
    }
    
    if (max !== undefined) {
      validation = validation.isFloat({ max }).withMessage(`${field} must be at most ${max}`);
    }
    
    return validation;
  },
  
  // Boolean validation
  boolean: (field) => {
    return body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be true or false`)
      .toBoolean();
  },
  
  // Date validation
  date: (field) => {
    return body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid date`)
      .toDate();
  },
  
  // Array validation
  array: (field, minLength = 0, maxLength = 100) => {
    return body(field)
      .optional()
      .isArray({ min: minLength, max: maxLength })
      .withMessage(`${field} must be an array with ${minLength}-${maxLength} items`);
  },
  
  // JSON validation
  json: (field) => {
    return body(field)
      .optional()
      .custom((value) => {
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
          return true;
        } catch {
          throw new Error(`${field} must be valid JSON`);
        }
      });
  },
  
  // Enum validation
  enum: (field, values) => {
    return body(field)
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`);
  },
  
  // Pagination validation
  pagination: () => {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
      query('sort')
        .optional()
        .matches(/^[a-zA-Z_]+:(asc|desc)$/)
        .withMessage('Sort must be in format field:asc or field:desc'),
    ];
  },
};

// Specific validation schemas
const validations = {
  // User validations
  createUser: [
    commonValidations.email(),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    commonValidations.password(),
    commonValidations.optionalString('first_name', 1, 100),
    commonValidations.optionalString('last_name', 1, 100),
    commonValidations.optionalString('phone', 10, 20),
    handleValidationErrors,
  ],
  
  updateUser: [
    commonValidations.optionalString('first_name', 1, 100),
    commonValidations.optionalString('last_name', 1, 100),
    commonValidations.optionalString('phone', 10, 20),
    commonValidations.json('preferences'),
    handleValidationErrors,
  ],
  
  login: [
    commonValidations.email(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  
  // Vehicle validations
  createVehicle: [
    body('vin')
      .optional()
      .isLength({ min: 17, max: 17 })
      .withMessage('VIN must be exactly 17 characters')
      .matches(/^[A-HJ-NPR-Z0-9]{17}$/)
      .withMessage('Invalid VIN format'),
    commonValidations.requiredString('make', 1, 100),
    commonValidations.requiredString('model', 1, 100),
    body('year')
      .notEmpty()
      .withMessage('Year is required')
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage('Invalid year'),
    commonValidations.optionalString('trim', 1, 100),
    commonValidations.optionalString('engine_type', 1, 200),
    body('mileage')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Mileage must be a positive number'),
    handleValidationErrors,
  ],
  
  // Part validations
  createPart: [
    commonValidations.requiredString('part_number', 1, 100),
    commonValidations.requiredString('name', 1, 255),
    commonValidations.requiredString('category', 1, 100),
    commonValidations.requiredString('manufacturer', 1, 100),
    body('price_min')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be positive'),
    body('price_max')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be positive')
      .custom((value, { req }) => {
        if (req.body.price_min && value < req.body.price_min) {
          throw new Error('Maximum price must be greater than minimum price');
        }
        return true;
      }),
    commonValidations.json('specifications'),
    commonValidations.json('compatibility_rules'),
    handleValidationErrors,
  ],
  
  // Scan validations
  createScan: [
    commonValidations.uuid('vehicle_id').optional(),
    commonValidations.enum('scan_type', ['engine_bay', 'vin', 'part_identification', 'full_vehicle']),
    body('images')
      .isArray({ min: 1, max: 10 })
      .withMessage('At least one image is required, maximum 10'),
    body('images.*')
      .isString()
      .withMessage('Each image must be a string URL'),
    handleValidationErrors,
  ],
  
  // Project validations
  createProject: [
    commonValidations.uuid('vehicle_id'),
    commonValidations.requiredString('title', 1, 255),
    commonValidations.optionalString('description', 1, 5000),
    body('budget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Budget must be positive'),
    commonValidations.enum('status', ['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']),
    commonValidations.enum('difficulty_level', ['beginner', 'intermediate', 'advanced', 'expert']),
    handleValidationErrors,
  ],
  
  // Review validations
  createReview: [
    body('rating')
      .notEmpty()
      .withMessage('Rating is required')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    commonValidations.requiredString('content', 10, 5000),
    commonValidations.optionalString('title', 1, 255),
    commonValidations.boolean('recommends'),
    commonValidations.enum('installation_difficulty', 
      ['very_easy', 'easy', 'moderate', 'difficult', 'very_difficult']),
    body('installation_time_hours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Installation time must be positive'),
    handleValidationErrors,
  ],
  
  // Search validations
  search: [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    ...commonValidations.pagination(),
    handleValidationErrors,
  ],
};

// Custom validation functions
const customValidators = {
  // Check if value exists in database
  exists: (table, field) => {
    return async (value) => {
      const { db } = require('../utils/database');
      const record = await db(table).where(field, value).first();
      if (!record) {
        throw new Error(`${field} does not exist`);
      }
      return true;
    };
  },
  
  // Check if value is unique in database
  unique: (table, field, excludeId = null) => {
    return async (value, { req }) => {
      const { db } = require('../utils/database');
      let query = db(table).where(field, value);
      
      if (excludeId || req.params.id) {
        query = query.whereNot('id', excludeId || req.params.id);
      }
      
      const record = await query.first();
      if (record) {
        throw new Error(`${field} already exists`);
      }
      return true;
    };
  },
  
  // Validate file upload
  fileValidation: (allowedTypes, maxSize) => {
    return (req, res, next) => {
      if (!req.file && !req.files) {
        return next();
      }
      
      const files = req.files || [req.file];
      
      for (const file of files) {
        // Check file type
        const fileType = file.mimetype.split('/')[1];
        if (!allowedTypes.includes(fileType)) {
          throw new ValidationError(`File type ${fileType} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }
        
        // Check file size
        if (file.size > maxSize) {
          throw new ValidationError(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
        }
      }
      
      next();
    };
  },
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  validations,
  customValidators,
};