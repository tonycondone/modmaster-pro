const Joi = require('joi');
const { body, query } = require('express-validator');

/**
 * Scan validation schemas using Joi
 */
const scanJoiSchemas = {
  // Process scan schema
  processScan: Joi.object({
    image: Joi.string()
      .required()
      .messages({
        'any.required': 'Image data is required'
      }),
    
    imageFormat: Joi.string()
      .valid('jpeg', 'jpg', 'png', 'webp')
      .optional()
      .default('jpeg'),
    
    vehicleId: Joi.string()
      .optional(),
    
    metadata: Joi.object({
      deviceInfo: Joi.object({
        model: Joi.string().max(100).optional(),
        os: Joi.string().max(50).optional(),
        appVersion: Joi.string().max(20).optional()
      }).optional(),
      
      location: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
        accuracy: Joi.number().positive().optional()
      }).optional(),
      
      captureSettings: Joi.object({
        flash: Joi.boolean().optional(),
        zoom: Joi.number().min(1).max(10).optional(),
        resolution: Joi.string().optional()
      }).optional(),
      
      userNotes: Joi.string()
        .max(500)
        .optional()
    }).optional(),
    
    options: Joi.object({
      priority: Joi.string()
        .valid('low', 'normal', 'high')
        .optional()
        .default('normal'),
      
      enhanceImage: Joi.boolean()
        .optional()
        .default(true),
      
      detectMultiple: Joi.boolean()
        .optional()
        .default(true),
      
      includeRelated: Joi.boolean()
        .optional()
        .default(true),
      
      minConfidence: Joi.number()
        .min(0)
        .max(1)
        .optional()
        .default(0.5)
    }).optional()
  }),

  // Batch scan schema
  batchScan: Joi.object({
    images: Joi.array()
      .items(Joi.object({
        image: Joi.string().required(),
        imageFormat: Joi.string().valid('jpeg', 'jpg', 'png', 'webp').optional(),
        metadata: Joi.object().optional()
      }))
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': 'At least one image is required',
        'array.max': 'Maximum 10 images allowed per batch'
      }),
    
    vehicleId: Joi.string()
      .optional(),
    
    options: Joi.object({
      priority: Joi.string()
        .valid('low', 'normal', 'high')
        .optional()
        .default('normal'),
      
      processInParallel: Joi.boolean()
        .optional()
        .default(false)
    }).optional()
  }),

  // Get scan history schema
  getScanHistory: Joi.object({
    vehicleId: Joi.string().optional(),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
    dateFrom: Joi.date().max('now').optional(),
    dateTo: Joi.date().min(Joi.ref('dateFrom')).max('now').optional(),
    hasResults: Joi.boolean().optional(),
    sortBy: Joi.string().valid('date', 'confidence', 'partsCount').optional().default('date'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(50).optional().default(20)
  }),

  // Update scan results schema
  updateScanResults: Joi.object({
    feedback: Joi.object({
      accurate: Joi.boolean().required(),
      missedParts: Joi.array()
        .items(Joi.string().trim().max(100))
        .max(10)
        .optional(),
      incorrectParts: Joi.array()
        .items(Joi.string())
        .max(10)
        .optional(),
      notes: Joi.string()
        .max(500)
        .optional()
    }).optional(),
    
    selectedParts: Joi.array()
      .items(Joi.string())
      .optional(),
    
    vehicleId: Joi.string()
      .optional()
  }),

  // Request rescan schema
  requestRescan: Joi.object({
    reason: Joi.string()
      .valid('poor_quality', 'incorrect_results', 'partial_detection', 'other')
      .required()
      .messages({
        'any.required': 'Reason for rescan is required'
      }),
    
    details: Joi.string()
      .max(500)
      .when('reason', {
        is: 'other',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'any.required': 'Details are required when reason is "other"'
      }),
    
    enhancementOptions: Joi.object({
      adjustBrightness: Joi.boolean().optional(),
      adjustContrast: Joi.boolean().optional(),
      denoise: Joi.boolean().optional(),
      sharpen: Joi.boolean().optional()
    }).optional()
  })
};

/**
 * Express-validator schemas
 */
const scanValidators = {
  // Process scan validators
  processScan: [
    body('image')
      .notEmpty()
      .withMessage('Image data is required')
      .isLength({ max: 10 * 1024 * 1024 }) // 10MB base64 limit
      .withMessage('Image data too large'),
    
    body('imageFormat')
      .optional()
      .isIn(['jpeg', 'jpg', 'png', 'webp'])
      .withMessage('Invalid image format'),
    
    body('vehicleId')
      .optional()
      .isMongoId()
      .withMessage('Invalid vehicle ID'),
    
    body('metadata.location.lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    
    body('metadata.location.lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    
    body('options.minConfidence')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Confidence must be between 0 and 1')
  ],

  // Batch scan validators
  batchScan: [
    body('images')
      .isArray({ min: 1, max: 10 })
      .withMessage('Images array must contain 1-10 items'),
    
    body('images.*.image')
      .notEmpty()
      .withMessage('Each image must have data'),
    
    body('images.*.imageFormat')
      .optional()
      .isIn(['jpeg', 'jpg', 'png', 'webp'])
      .withMessage('Invalid image format')
  ],

  // Get scan history validators
  getScanHistory: [
    query('dateFrom')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid date format'),
    
    query('dateTo')
      .optional()
      .isISO8601()
      .toDate()
      .custom((value, { req }) => {
        if (req.query.dateFrom && value < req.query.dateFrom) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
      .withMessage('Invalid date range'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],

  // Update scan results validators
  updateScanResults: [
    body('feedback.accurate')
      .optional()
      .isBoolean()
      .withMessage('Accurate must be a boolean'),
    
    body('feedback.missedParts')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 missed parts allowed'),
    
    body('feedback.notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  // Request rescan validators
  requestRescan: [
    body('reason')
      .isIn(['poor_quality', 'incorrect_results', 'partial_detection', 'other'])
      .withMessage('Invalid rescan reason'),
    
    body('details')
      .if(body('reason').equals('other'))
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage('Details are required for "other" reason and cannot exceed 500 characters')
  ]
};

module.exports = {
  scanJoiSchemas,
  scanValidators
};