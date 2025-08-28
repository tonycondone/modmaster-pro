const Joi = require('joi');
const { body, query } = require('express-validator');
const { customValidators } = require('../middleware/validation');

/**
 * Vehicle validation schemas using Joi
 */
const vehicleJoiSchemas = {
  // Create vehicle schema
  createVehicle: Joi.object({
    make: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Vehicle make is required',
        'string.min': 'Make must be at least 2 characters'
      }),
    
    model: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Vehicle model is required',
        'string.min': 'Model must be at least 2 characters'
      }),
    
    year: Joi.number()
      .integer()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .required()
      .messages({
        'any.required': 'Vehicle year is required',
        'number.min': 'Year must be 1900 or later',
        'number.max': 'Invalid year'
      }),
    
    vin: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid VIN format. VIN must be 17 characters'
      }),
    
    licensePlate: Joi.string()
      .trim()
      .uppercase()
      .max(15)
      .optional()
      .allow('', null),
    
    color: Joi.string()
      .trim()
      .max(30)
      .optional(),
    
    mileage: Joi.number()
      .integer()
      .min(0)
      .max(999999)
      .required()
      .messages({
        'any.required': 'Current mileage is required',
        'number.min': 'Mileage cannot be negative',
        'number.max': 'Invalid mileage value'
      }),
    
    transmission: Joi.string()
      .valid('manual', 'automatic', 'cvt', 'dual-clutch', 'other')
      .optional(),
    
    fuelType: Joi.string()
      .valid('gasoline', 'diesel', 'electric', 'hybrid', 'plugin-hybrid', 'hydrogen', 'other')
      .optional(),
    
    engine: Joi.object({
      size: Joi.string().max(20).optional(),
      cylinders: Joi.number().integer().min(1).max(16).optional(),
      horsepower: Joi.number().integer().min(1).max(2000).optional(),
      torque: Joi.number().integer().min(1).max(2000).optional()
    }).optional(),
    
    purchaseDate: Joi.date()
      .max('now')
      .optional(),
    
    purchasePrice: Joi.number()
      .min(0)
      .max(10000000)
      .optional(),
    
    insurance: Joi.object({
      provider: Joi.string().max(100).optional(),
      policyNumber: Joi.string().max(50).optional(),
      expiryDate: Joi.date().optional()
    }).optional(),
    
    notes: Joi.string()
      .max(1000)
      .optional()
      .allow(''),
    
    photos: Joi.array()
      .items(Joi.string().uri())
      .max(10)
      .optional()
  }),

  // Update vehicle schema
  updateVehicle: Joi.object({
    make: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    
    model: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    
    year: Joi.number()
      .integer()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .optional(),
    
    vin: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
      .optional()
      .allow('', null),
    
    licensePlate: Joi.string()
      .trim()
      .uppercase()
      .max(15)
      .optional()
      .allow('', null),
    
    color: Joi.string()
      .trim()
      .max(30)
      .optional(),
    
    mileage: Joi.number()
      .integer()
      .min(0)
      .max(999999)
      .optional(),
    
    transmission: Joi.string()
      .valid('manual', 'automatic', 'cvt', 'dual-clutch', 'other')
      .optional(),
    
    fuelType: Joi.string()
      .valid('gasoline', 'diesel', 'electric', 'hybrid', 'plugin-hybrid', 'hydrogen', 'other')
      .optional(),
    
    engine: Joi.object({
      size: Joi.string().max(20).optional(),
      cylinders: Joi.number().integer().min(1).max(16).optional(),
      horsepower: Joi.number().integer().min(1).max(2000).optional(),
      torque: Joi.number().integer().min(1).max(2000).optional()
    }).optional(),
    
    purchaseDate: Joi.date()
      .max('now')
      .optional(),
    
    purchasePrice: Joi.number()
      .min(0)
      .max(10000000)
      .optional(),
    
    insurance: Joi.object({
      provider: Joi.string().max(100).optional(),
      policyNumber: Joi.string().max(50).optional(),
      expiryDate: Joi.date().optional()
    }).optional(),
    
    notes: Joi.string()
      .max(1000)
      .optional()
      .allow(''),
    
    photos: Joi.array()
      .items(Joi.string().uri())
      .max(10)
      .optional(),
    
    active: Joi.boolean()
      .optional()
  }),

  // Add maintenance record schema
  addMaintenance: Joi.object({
    type: Joi.string()
      .trim()
      .required()
      .valid(
        'Oil Change',
        'Tire Rotation',
        'Brake Service',
        'Air Filter',
        'Transmission Service',
        'Coolant Flush',
        'Battery Replacement',
        'Spark Plugs',
        'Wheel Alignment',
        'Other'
      )
      .messages({
        'any.required': 'Maintenance type is required'
      }),
    
    serviceDate: Joi.date()
      .max('now')
      .required()
      .messages({
        'any.required': 'Service date is required',
        'date.max': 'Service date cannot be in the future'
      }),
    
    mileage: Joi.number()
      .integer()
      .min(0)
      .max(999999)
      .required()
      .messages({
        'any.required': 'Service mileage is required',
        'number.min': 'Mileage cannot be negative'
      }),
    
    cost: Joi.number()
      .min(0)
      .max(99999)
      .optional(),
    
    serviceProvider: Joi.object({
      name: Joi.string().max(100).optional(),
      address: Joi.string().max(200).optional(),
      phone: Joi.string().max(20).optional()
    }).optional(),
    
    parts: Joi.array()
      .items(Joi.object({
        name: Joi.string().max(100).required(),
        partNumber: Joi.string().max(50).optional(),
        cost: Joi.number().min(0).optional()
      }))
      .max(20)
      .optional(),
    
    notes: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    
    nextServiceDue: Joi.object({
      date: Joi.date().min('now').optional(),
      mileage: Joi.number().integer().min(Joi.ref('....mileage')).optional()
    }).optional(),
    
    attachments: Joi.array()
      .items(Joi.string().uri())
      .max(5)
      .optional()
  }),

  // Vehicle search schema
  searchVehicles: Joi.object({
    make: Joi.string().trim().optional(),
    model: Joi.string().trim().optional(),
    yearMin: Joi.number().integer().min(1900).optional(),
    yearMax: Joi.number().integer().max(new Date().getFullYear() + 1).optional(),
    mileageMin: Joi.number().integer().min(0).optional(),
    mileageMax: Joi.number().integer().max(999999).optional(),
    transmission: Joi.string().valid('manual', 'automatic', 'cvt', 'dual-clutch', 'other').optional(),
    fuelType: Joi.string().valid('gasoline', 'diesel', 'electric', 'hybrid', 'plugin-hybrid', 'hydrogen', 'other').optional(),
    active: Joi.boolean().optional(),
    sortBy: Joi.string().valid('year', 'mileage', 'make', 'model', 'createdAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
  })
};

/**
 * Express-validator schemas
 */
const vehicleValidators = {
  // Create vehicle validators
  createVehicle: [
    body('make')
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 50 })
      .withMessage('Vehicle make is required and must be 2-50 characters'),
    
    body('model')
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 50 })
      .withMessage('Vehicle model is required and must be 2-50 characters'),
    
    body('year')
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage('Invalid vehicle year'),
    
    body('vin')
      .optional()
      .trim()
      .toUpperCase()
      .custom(customValidators.isVIN)
      .withMessage('Invalid VIN format'),
    
    body('mileage')
      .isInt({ min: 0, max: 999999 })
      .withMessage('Invalid mileage value'),
    
    body('transmission')
      .optional()
      .isIn(['manual', 'automatic', 'cvt', 'dual-clutch', 'other'])
      .withMessage('Invalid transmission type'),
    
    body('fuelType')
      .optional()
      .isIn(['gasoline', 'diesel', 'electric', 'hybrid', 'plugin-hybrid', 'hydrogen', 'other'])
      .withMessage('Invalid fuel type'),
    
    body('purchasePrice')
      .optional()
      .isFloat({ min: 0, max: 10000000 })
      .withMessage('Invalid purchase price')
  ],

  // Update vehicle validators
  updateVehicle: [
    body('make')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 50 })
      .withMessage('Vehicle make must be 2-50 characters'),
    
    body('model')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 50 })
      .withMessage('Vehicle model must be 2-50 characters'),
    
    body('year')
      .optional()
      .custom(customValidators.isValidYear)
      .withMessage('Invalid vehicle year'),
    
    body('vin')
      .optional()
      .trim()
      .toUpperCase()
      .custom((value) => !value || customValidators.isVIN(value))
      .withMessage('Invalid VIN format'),
    
    body('mileage')
      .optional()
      .isInt({ min: 0, max: 999999 })
      .withMessage('Invalid mileage value')
      .custom((value, { req }) => {
        // Ensure mileage doesn't decrease
        if (req.vehicle && value < req.vehicle.mileage) {
          throw new Error('Mileage cannot be less than previous value');
        }
        return true;
      })
  ],

  // Add maintenance validators
  addMaintenance: [
    body('type')
      .trim()
      .notEmpty()
      .isIn([
        'Oil Change',
        'Tire Rotation',
        'Brake Service',
        'Air Filter',
        'Transmission Service',
        'Coolant Flush',
        'Battery Replacement',
        'Spark Plugs',
        'Wheel Alignment',
        'Other'
      ])
      .withMessage('Invalid maintenance type'),
    
    body('serviceDate')
      .isISO8601()
      .toDate()
      .custom((value) => value <= new Date())
      .withMessage('Service date cannot be in the future'),
    
    body('mileage')
      .isInt({ min: 0, max: 999999 })
      .withMessage('Invalid service mileage'),
    
    body('cost')
      .optional()
      .isFloat({ min: 0, max: 99999 })
      .withMessage('Invalid cost amount')
  ],

  // Search vehicles validators
  searchVehicles: [
    query('yearMin')
      .optional()
      .isInt({ min: 1900 })
      .withMessage('Invalid minimum year'),
    
    query('yearMax')
      .optional()
      .isInt({ max: new Date().getFullYear() + 1 })
      .withMessage('Invalid maximum year')
      .custom((value, { req }) => {
        if (req.query.yearMin && value < req.query.yearMin) {
          throw new Error('Maximum year must be greater than minimum year');
        }
        return true;
      }),
    
    query('mileageMin')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid minimum mileage'),
    
    query('mileageMax')
      .optional()
      .isInt({ max: 999999 })
      .withMessage('Invalid maximum mileage')
      .custom((value, { req }) => {
        if (req.query.mileageMin && value < req.query.mileageMin) {
          throw new Error('Maximum mileage must be greater than minimum mileage');
        }
        return true;
      })
  ]
};

module.exports = {
  vehicleJoiSchemas,
  vehicleValidators
};