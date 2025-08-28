const Joi = require('joi');
const { body, query } = require('express-validator');

/**
 * Payment validation schemas using Joi
 */
const paymentJoiSchemas = {
  // Create payment intent schema
  createPaymentIntent: Joi.object({
    amount: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .required()
      .messages({
        'any.required': 'Payment amount is required',
        'number.positive': 'Amount must be greater than 0'
      }),
    
    currency: Joi.string()
      .uppercase()
      .length(3)
      .optional()
      .default('USD'),
    
    items: Joi.array()
      .items(Joi.object({
        partId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().required()
      }))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one item is required'
      }),
    
    shipping: Joi.object({
      name: Joi.string().trim().required(),
      address: Joi.object({
        line1: Joi.string().trim().required(),
        line2: Joi.string().trim().optional().allow(''),
        city: Joi.string().trim().required(),
        state: Joi.string().trim().required(),
        postalCode: Joi.string().trim().required(),
        country: Joi.string().length(2).uppercase().required()
      }).required(),
      phone: Joi.string().trim().optional(),
      carrier: Joi.string().trim().optional(),
      tracking: Joi.string().trim().optional()
    }).required(),
    
    billing: Joi.object({
      name: Joi.string().trim().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().trim().optional(),
      address: Joi.object({
        line1: Joi.string().trim().required(),
        line2: Joi.string().trim().optional().allow(''),
        city: Joi.string().trim().required(),
        state: Joi.string().trim().required(),
        postalCode: Joi.string().trim().required(),
        country: Joi.string().length(2).uppercase().required()
      }).optional()
    }).optional(),
    
    metadata: Joi.object({
      orderId: Joi.string().optional(),
      customerId: Joi.string().optional(),
      vehicleId: Joi.string().optional(),
      couponCode: Joi.string().optional(),
      notes: Joi.string().max(500).optional()
    }).optional(),
    
    savePaymentMethod: Joi.boolean()
      .optional()
      .default(false),
    
    useExistingPaymentMethod: Joi.string()
      .optional()
  }),

  // Update payment intent schema
  updatePaymentIntent: Joi.object({
    amount: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .optional(),
    
    shipping: Joi.object({
      name: Joi.string().trim().optional(),
      address: Joi.object({
        line1: Joi.string().trim().optional(),
        line2: Joi.string().trim().optional().allow(''),
        city: Joi.string().trim().optional(),
        state: Joi.string().trim().optional(),
        postalCode: Joi.string().trim().optional(),
        country: Joi.string().length(2).uppercase().optional()
      }).optional(),
      carrier: Joi.string().trim().optional(),
      tracking: Joi.string().trim().optional()
    }).optional(),
    
    metadata: Joi.object().optional()
  }),

  // Confirm payment schema
  confirmPayment: Joi.object({
    paymentIntentId: Joi.string()
      .required()
      .messages({
        'any.required': 'Payment intent ID is required'
      }),
    
    paymentMethodId: Joi.string()
      .required()
      .messages({
        'any.required': 'Payment method ID is required'
      }),
    
    returnUrl: Joi.string()
      .uri()
      .optional()
  }),

  // Create subscription schema
  createSubscription: Joi.object({
    planId: Joi.string()
      .required()
      .valid('basic', 'pro', 'enterprise')
      .messages({
        'any.required': 'Subscription plan is required'
      }),
    
    paymentMethodId: Joi.string()
      .required()
      .messages({
        'any.required': 'Payment method is required'
      }),
    
    billingCycle: Joi.string()
      .valid('monthly', 'yearly')
      .optional()
      .default('monthly'),
    
    trialDays: Joi.number()
      .integer()
      .min(0)
      .max(30)
      .optional(),
    
    couponCode: Joi.string()
      .trim()
      .max(50)
      .optional()
  }),

  // Cancel subscription schema
  cancelSubscription: Joi.object({
    reason: Joi.string()
      .valid('too_expensive', 'not_using', 'missing_features', 'found_alternative', 'other')
      .required()
      .messages({
        'any.required': 'Cancellation reason is required'
      }),
    
    feedback: Joi.string()
      .max(1000)
      .when('reason', {
        is: 'other',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'any.required': 'Please provide details for cancellation'
      }),
    
    immediately: Joi.boolean()
      .optional()
      .default(false)
  }),

  // Apply coupon schema
  applyCoupon: Joi.object({
    couponCode: Joi.string()
      .trim()
      .uppercase()
      .min(3)
      .max(50)
      .required()
      .messages({
        'any.required': 'Coupon code is required'
      }),
    
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'any.required': 'Order amount is required'
      })
  }),

  // Refund request schema
  refundRequest: Joi.object({
    orderId: Joi.string()
      .required()
      .messages({
        'any.required': 'Order ID is required'
      }),
    
    reason: Joi.string()
      .valid('defective', 'not_as_described', 'wrong_item', 'damaged', 'not_received', 'other')
      .required()
      .messages({
        'any.required': 'Refund reason is required'
      }),
    
    items: Joi.array()
      .items(Joi.object({
        partId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        amount: Joi.number().positive().required()
      }))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one item must be selected for refund'
      }),
    
    details: Joi.string()
      .max(1000)
      .required()
      .messages({
        'any.required': 'Please provide details about the refund request'
      }),
    
    images: Joi.array()
      .items(Joi.string().uri())
      .max(5)
      .optional(),
    
    preferredResolution: Joi.string()
      .valid('refund', 'exchange', 'store_credit')
      .optional()
      .default('refund')
  }),

  // Get payment history schema
  getPaymentHistory: Joi.object({
    startDate: Joi.date().max('now').optional(),
    endDate: Joi.date().min(Joi.ref('startDate')).max('now').optional(),
    status: Joi.array().items(Joi.string().valid('succeeded', 'pending', 'failed', 'refunded')).single().optional(),
    type: Joi.array().items(Joi.string().valid('payment', 'refund', 'subscription')).single().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().greater(Joi.ref('minAmount')).optional(),
    sortBy: Joi.string().valid('date', 'amount', 'status').optional().default('date'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20)
  })
};

/**
 * Express-validator schemas
 */
const paymentValidators = {
  // Create payment intent validators
  createPaymentIntent: [
    body('amount')
      .isFloat({ min: 0.01, max: 999999.99 })
      .withMessage('Invalid payment amount'),
    
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    
    body('items.*.partId')
      .notEmpty()
      .withMessage('Part ID is required for each item'),
    
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    
    body('shipping.address.postalCode')
      .matches(/^[A-Z0-9\s-]+$/i)
      .withMessage('Invalid postal code format'),
    
    body('billing.email')
      .normalizeEmail()
      .isEmail()
      .withMessage('Invalid email address')
  ],

  // Confirm payment validators
  confirmPayment: [
    body('paymentIntentId')
      .notEmpty()
      .matches(/^pi_[a-zA-Z0-9]+$/)
      .withMessage('Invalid payment intent ID format'),
    
    body('paymentMethodId')
      .notEmpty()
      .matches(/^pm_[a-zA-Z0-9]+$/)
      .withMessage('Invalid payment method ID format')
  ],

  // Create subscription validators
  createSubscription: [
    body('planId')
      .isIn(['basic', 'pro', 'enterprise'])
      .withMessage('Invalid subscription plan'),
    
    body('paymentMethodId')
      .notEmpty()
      .matches(/^pm_[a-zA-Z0-9]+$/)
      .withMessage('Invalid payment method ID format'),
    
    body('couponCode')
      .optional()
      .trim()
      .toUpperCase()
      .matches(/^[A-Z0-9_-]+$/)
      .withMessage('Invalid coupon code format')
  ],

  // Apply coupon validators
  applyCoupon: [
    body('couponCode')
      .trim()
      .toUpperCase()
      .matches(/^[A-Z0-9_-]+$/)
      .isLength({ min: 3, max: 50 })
      .withMessage('Invalid coupon code format'),
    
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Invalid order amount')
  ],

  // Refund request validators
  refundRequest: [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required'),
    
    body('reason')
      .isIn(['defective', 'not_as_described', 'wrong_item', 'damaged', 'not_received', 'other'])
      .withMessage('Invalid refund reason'),
    
    body('details')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Details must be 10-1000 characters'),
    
    body('images')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 images allowed'),
    
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Invalid image URL')
  ],

  // Get payment history validators
  getPaymentHistory: [
    query('startDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid start date format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .toDate()
      .custom((value, { req }) => {
        if (req.query.startDate && value < req.query.startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
      .withMessage('Invalid date range'),
    
    query('minAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum amount must be 0 or greater'),
    
    query('maxAmount')
      .optional()
      .isFloat({ min: 0 })
      .custom((value, { req }) => {
        if (req.query.minAmount && parseFloat(value) < parseFloat(req.query.minAmount)) {
          throw new Error('Maximum amount must be greater than minimum amount');
        }
        return true;
      })
      .withMessage('Invalid amount range')
  ]
};

module.exports = {
  paymentJoiSchemas,
  paymentValidators
};