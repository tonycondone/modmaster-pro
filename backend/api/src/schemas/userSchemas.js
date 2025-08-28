const Joi = require('joi');
const { body } = require('express-validator');
const { customValidators } = require('../middleware/validation');

/**
 * User validation schemas using Joi
 */
const userJoiSchemas = {
  // User registration schema
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .max(255)
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
        'any.required': 'Password is required'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      }),
    
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .pattern(/^[a-zA-Z\s'-]+$/)
      .messages({
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens and apostrophes',
        'any.required': 'First name is required'
      }),
    
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .pattern(/^[a-zA-Z\s'-]+$/)
      .messages({
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens and apostrophes',
        'any.required': 'Last name is required'
      }),
    
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    
    acceptTerms: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the terms and conditions',
        'any.required': 'Terms acceptance is required'
      }),
    
    marketingOptIn: Joi.boolean()
      .optional()
      .default(false)
  }),

  // User login schema
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      }),
    
    rememberMe: Joi.boolean()
      .optional()
      .default(false),
    
    deviceId: Joi.string()
      .optional()
      .max(255)
  }),

  // Update profile schema
  updateProfile: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional()
      .pattern(/^[a-zA-Z\s'-]+$/),
    
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional()
      .pattern(/^[a-zA-Z\s'-]+$/),
    
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow('', null),
    
    bio: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    
    location: Joi.object({
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      country: Joi.string().max(100).optional(),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional()
      }).optional()
    }).optional(),
    
    preferences: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de').optional(),
      timezone: Joi.string().max(50).optional(),
      units: Joi.string().valid('metric', 'imperial').optional(),
      theme: Joi.string().valid('light', 'dark', 'auto').optional()
    }).optional(),
    
    notificationPreferences: Joi.object({
      email: Joi.boolean().optional(),
      push: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      maintenanceReminders: Joi.boolean().optional(),
      priceAlerts: Joi.boolean().optional(),
      newsletterUpdates: Joi.boolean().optional()
    }).optional()
  }),

  // Change password schema
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .invalid(Joi.ref('currentPassword'))
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
        'any.required': 'New password is required',
        'any.invalid': 'New password must be different from current password'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  }),

  // Forgot password schema
  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  }),

  // Reset password schema
  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
        'any.required': 'New password is required'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  }),

  // Email verification schema
  verifyEmail: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Verification token is required'
      })
  }),

  // Two-factor authentication schemas
  enable2FA: Joi.object({
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required to enable 2FA'
      })
  }),

  verify2FA: Joi.object({
    token: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.length': '2FA token must be 6 digits',
        'string.pattern.base': '2FA token must contain only numbers',
        'any.required': '2FA token is required'
      })
  }),

  disable2FA: Joi.object({
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required to disable 2FA'
      }),
    
    token: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.length': '2FA token must be 6 digits',
        'string.pattern.base': '2FA token must contain only numbers',
        'any.required': '2FA token is required'
      })
  })
};

/**
 * Express-validator schemas
 */
const userValidators = {
  // Registration validators
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
    
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
    
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('phone')
      .optional()
      .custom(customValidators.isPhoneNumber)
      .withMessage('Please provide a valid phone number'),
    
    body('acceptTerms')
      .isBoolean()
      .equals('true')
      .withMessage('You must accept the terms and conditions')
  ],

  // Login validators
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Update profile validators
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('phone')
      .optional()
      .custom(customValidators.isPhoneNumber)
      .withMessage('Please provide a valid phone number'),
    
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    
    body('location.coordinates')
      .optional()
      .custom(customValidators.isValidCoordinates)
      .withMessage('Invalid coordinates'),
    
    body('preferences.language')
      .optional()
      .isIn(['en', 'es', 'fr', 'de'])
      .withMessage('Invalid language selection'),
    
    body('preferences.units')
      .optional()
      .isIn(['metric', 'imperial'])
      .withMessage('Invalid unit selection'),
    
    body('preferences.theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Invalid theme selection')
  ],

  // Change password validators
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character')
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('New password must be different from current password'),
    
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match')
  ]
};

module.exports = {
  userJoiSchemas,
  userValidators
};