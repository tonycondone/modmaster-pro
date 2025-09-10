const Joi = require('joi');
const { body, query } = require('express-validator');
const { customValidators } = require('../middleware/validation');

/**
 * Part validation schemas using Joi
 */
const partJoiSchemas = {
  // Create part schema (for admin/sellers)
  createPart: Joi.object({
    name: Joi.string()
      .trim()
      .min(3)
      .max(200)
      .required()
      .messages({
        'any.required': 'Part name is required',
        'string.min': 'Part name must be at least 3 characters'
      }),
    
    description: Joi.string()
      .trim()
      .min(10)
      .max(2000)
      .required()
      .messages({
        'any.required': 'Part description is required',
        'string.min': 'Description must be at least 10 characters'
      }),
    
    category: Joi.string()
      .trim()
      .required()
      .valid(
        'Engine',
        'Transmission',
        'Brakes',
        'Suspension',
        'Exhaust',
        'Electrical',
        'Body',
        'Interior',
        'Wheels & Tires',
        'Cooling',
        'Fuel System',
        'Ignition',
        'Filters',
        'Belts & Hoses',
        'Lighting',
        'HVAC',
        'Accessories',
        'Tools',
        'Fluids',
        'Other'
      )
      .messages({
        'any.required': 'Part category is required'
      }),
    
    subcategory: Joi.string()
      .trim()
      .max(100)
      .optional(),
    
    manufacturer: Joi.object({
      name: Joi.string().trim().max(100).required(),
      partNumber: Joi.string().trim().max(100).required(),
      oem: Joi.boolean().optional().default(false)
    }).required(),
    
    price: Joi.number()
      .positive()
      .precision(2)
      .max(99999.99)
      .required()
      .messages({
        'any.required': 'Price is required',
        'number.positive': 'Price must be greater than 0'
      }),
    
    compareAtPrice: Joi.number()
      .positive()
      .precision(2)
      .max(99999.99)
      .greater(Joi.ref('price'))
      .optional()
      .messages({
        'number.greater': 'Compare at price must be greater than regular price'
      }),
    
    cost: Joi.number()
      .positive()
      .precision(2)
      .max(99999.99)
      .less(Joi.ref('price'))
      .optional()
      .messages({
        'number.less': 'Cost must be less than selling price'
      }),
    
    stock: Joi.object({
      quantity: Joi.number().integer().min(0).required(),
      lowStockThreshold: Joi.number().integer().min(0).optional().default(5),
      trackInventory: Joi.boolean().optional().default(true),
      allowBackorder: Joi.boolean().optional().default(false)
    }).required(),
    
    condition: Joi.string()
      .valid('new', 'oem', 'aftermarket', 'refurbished', 'used')
      .required()
      .messages({
        'any.required': 'Part condition is required'
      }),
    
    warranty: Joi.object({
      available: Joi.boolean().required(),
      duration: Joi.when('available', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.optional()
      }),
      terms: Joi.when('available', {
        is: true,
        then: Joi.string().max(1000).optional(),
        otherwise: Joi.optional()
      })
    }).optional(),
    
    compatibility: Joi.array()
      .items(Joi.object({
        make: Joi.string().trim().required(),
        model: Joi.string().trim().required(),
        yearStart: Joi.number().integer().min(1900).required(),
        yearEnd: Joi.number().integer().min(Joi.ref('yearStart')).max(new Date().getFullYear() + 1).required(),
        engine: Joi.string().trim().optional(),
        trim: Joi.string().trim().optional(),
        notes: Joi.string().max(200).optional()
      }))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one vehicle compatibility entry is required'
      }),
    
    specifications: Joi.object({
      weight: Joi.number().positive().optional(),
      weightUnit: Joi.string().valid('lb', 'kg', 'oz', 'g').optional(),
      dimensions: Joi.object({
        length: Joi.number().positive().optional(),
        width: Joi.number().positive().optional(),
        height: Joi.number().positive().optional(),
        unit: Joi.string().valid('in', 'cm', 'mm').optional()
      }).optional(),
      material: Joi.string().max(100).optional(),
      color: Joi.string().max(50).optional(),
      finish: Joi.string().max(50).optional()
    }).optional(),
    
    images: Joi.array()
      .items(Joi.string().uri())
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': 'At least one product image is required'
      }),
    
    shipping: Joi.object({
      weight: Joi.number().positive().required(),
      dimensions: Joi.object({
        length: Joi.number().positive().required(),
        width: Joi.number().positive().required(),
        height: Joi.number().positive().required()
      }).required(),
      freeShipping: Joi.boolean().optional().default(false),
      expeditedAvailable: Joi.boolean().optional().default(true),
      internationalAvailable: Joi.boolean().optional().default(false)
    }).required(),
    
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(20)
      .optional(),
    
    active: Joi.boolean()
      .optional()
      .default(true),
    
    featured: Joi.boolean()
      .optional()
      .default(false)
  }),

  // Update part schema
  updatePart: Joi.object({
    name: Joi.string()
      .trim()
      .min(3)
      .max(200)
      .optional(),
    
    description: Joi.string()
      .trim()
      .min(10)
      .max(2000)
      .optional(),
    
    category: Joi.string()
      .trim()
      .valid(
        'Engine',
        'Transmission',
        'Brakes',
        'Suspension',
        'Exhaust',
        'Electrical',
        'Body',
        'Interior',
        'Wheels & Tires',
        'Cooling',
        'Fuel System',
        'Ignition',
        'Filters',
        'Belts & Hoses',
        'Lighting',
        'HVAC',
        'Accessories',
        'Tools',
        'Fluids',
        'Other'
      )
      .optional(),
    
    price: Joi.number()
      .positive()
      .precision(2)
      .max(99999.99)
      .optional(),
    
    stock: Joi.object({
      quantity: Joi.number().integer().min(0).optional(),
      lowStockThreshold: Joi.number().integer().min(0).optional(),
      trackInventory: Joi.boolean().optional(),
      allowBackorder: Joi.boolean().optional()
    }).optional(),
    
    active: Joi.boolean()
      .optional(),
    
    featured: Joi.boolean()
      .optional()
  }),

  // Search parts schema
  searchParts: Joi.object({
    query: Joi.string().trim().min(2).optional(),
    category: Joi.array().items(Joi.string()).single().optional(),
    subcategory: Joi.string().trim().optional(),
    condition: Joi.array().items(Joi.string().valid('new', 'oem', 'aftermarket', 'refurbished', 'used')).single().optional(),
    priceMin: Joi.number().min(0).optional(),
    priceMax: Joi.number().max(99999).optional(),
    manufacturer: Joi.array().items(Joi.string()).single().optional(),
    inStock: Joi.boolean().optional(),
    featured: Joi.boolean().optional(),
    freeShipping: Joi.boolean().optional(),
    hasWarranty: Joi.boolean().optional(),
    vehicle: Joi.object({
      make: Joi.string().trim().required(),
      model: Joi.string().trim().required(),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required()
    }).optional(),
    sortBy: Joi.string().valid('price', 'name', 'rating', 'popularity', 'newest').optional().default('popularity'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20)
  }),

  // Add to cart schema
  addToCart: Joi.object({
    partId: Joi.string()
      .required()
      .messages({
        'any.required': 'Part ID is required'
      }),
    
    quantity: Joi.number()
      .integer()
      .min(1)
      .max(99)
      .required()
      .messages({
        'any.required': 'Quantity is required',
        'number.min': 'Quantity must be at least 1',
        'number.max': 'Quantity cannot exceed 99'
      }),
    
    vehicleId: Joi.string()
      .optional()
  }),

  // Add review schema
  addReview: Joi.object({
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'any.required': 'Rating is required',
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating cannot exceed 5'
      }),
    
    title: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        'any.required': 'Review title is required',
        'string.min': 'Title must be at least 3 characters'
      }),
    
    comment: Joi.string()
      .trim()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'any.required': 'Review comment is required',
        'string.min': 'Comment must be at least 10 characters'
      }),
    
    verified: Joi.boolean()
      .optional()
      .default(false),
    
    images: Joi.array()
      .items(Joi.string().uri())
      .max(5)
      .optional(),
    
    vehicleInfo: Joi.object({
      make: Joi.string().trim().optional(),
      model: Joi.string().trim().optional(),
      year: Joi.number().integer().optional()
    }).optional(),
    
    pros: Joi.array()
      .items(Joi.string().trim().max(100))
      .max(5)
      .optional(),
    
    cons: Joi.array()
      .items(Joi.string().trim().max(100))
      .max(5)
      .optional()
  })
};

/**
 * Express-validator schemas
 */
const partValidators = {
  // Search parts validators
  searchParts: [
    query('query')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters'),
    
    query('priceMin')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be 0 or greater'),
    
    query('priceMax')
      .optional()
      .isFloat({ max: 99999 })
      .withMessage('Maximum price exceeded')
      .custom((value, { req }) => {
        if (req.query.priceMin && parseFloat(value) < parseFloat(req.query.priceMin)) {
          throw new Error('Maximum price must be greater than minimum price');
        }
        return true;
      }),
    
    query('vehicle.year')
      .optional()
      .custom(customValidators.isValidYear)
      .withMessage('Invalid vehicle year')
  ],

  // Add to cart validators
  addToCart: [
    body('partId')
      .notEmpty()
      .withMessage('Part ID is required'),
    
    body('quantity')
      .isInt({ min: 1, max: 99 })
      .withMessage('Quantity must be between 1 and 99')
  ],

  // Add review validators
  addReview: [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Review title must be 3-100 characters'),
    
    body('comment')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Review comment must be 10-1000 characters'),
    
    body('images')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 images allowed'),
    
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Invalid image URL')
  ],

  // Price validators
  validatePrice: [
    body('price')
      .custom(customValidators.isValidPrice)
      .withMessage('Invalid price format')
  ]
};

module.exports = {
  partJoiSchemas,
  partValidators
};