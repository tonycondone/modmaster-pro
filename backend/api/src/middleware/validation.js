const { body, validationResult } = require('express-validator');

const validate = (schemas) => {
  return async (req, res, next) => {
    await Promise.all(schemas.map(schema => schema.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  };
};

const validations = {
  createUser: [
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  updateUser: [
    body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  createPart: [
    body('name').trim().isLength({ min: 1 }).withMessage('Part name is required'),
    body('category').trim().isLength({ min: 1 }).withMessage('Part category is required'),
    body('brand').optional().trim().isLength({ min: 1 }).withMessage('Brand cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('description').optional().trim().isLength({ min: 1 }).withMessage('Description cannot be empty')
  ],
  createScan: [
    body('vehicleId').optional().isUUID().withMessage('Valid vehicle ID is required'),
    body('scanType').isIn(['engine_bay', 'vin', 'part_identification', 'full_vehicle']).withMessage('Valid scan type is required'),
    body('images').isArray({ min: 1 }).withMessage('At least one image is required'),
    body('images.*').isURL().withMessage('Valid image URL is required')
  ]
};

const commonValidations = {};

module.exports = { validate, validations, commonValidations };
