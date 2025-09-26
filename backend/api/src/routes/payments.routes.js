const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middleware/auth');
const { validateJoi } = require('../middleware/validation');
const stripeService = require('../services/stripeService');
const { db } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createCheckoutSchema = Joi.object({
  body: Joi.object({
    plan: Joi.string().valid('basic', 'pro', 'enterprise').required(),
    interval: Joi.string().valid('monthly', 'yearly').default('monthly')
  }).required()
});

/**
 * @swagger
 * /api/v1/payments/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan: 
 *                 type: string
 *                 enum: [basic, pro, enterprise]
 *               interval:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 default: monthly
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId: { type: string }
 *                 url: { type: string }
 */
router.post('/create-checkout-session', requireAuth, validateJoi(createCheckoutSchema), async (req, res) => {
  try {
    const { plan, interval } = req.body;
    const session = await stripeService.createCheckoutSession(req.user.id, plan, interval);
    
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/v1/payments/create-billing-portal-session:
 *   post:
 *     summary: Create a Stripe billing portal session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing portal session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 */
router.post('/create-billing-portal-session', requireAuth, async (req, res) => {
  try {
    const session = await stripeService.createBillingPortalSession(req.user.id);
    
    res.json({
      url: session.url
    });
  } catch (error) {
    logger.error('Error creating billing portal session:', error);
    res.status(500).json({ 
      message: 'Failed to create billing portal session',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/v1/payments/subscription:
 *   get:
 *     summary: Get current subscription details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await db('subscriptions')
      .where('user_id', req.user.id)
      .whereIn('status', ['active', 'trialing'])
      .first();

    const payments = await db('payments')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(5);

    res.json({ 
      subscription,
      payments 
    });
  } catch (error) {
    logger.error('Error fetching subscription:', error);
    res.status(500).json({ 
      message: 'Failed to fetch subscription details' 
    });
  }
});

/**
 * @swagger
 * /api/v1/payments/subscription/cancel:
 *   post:
 *     summary: Cancel subscription at period end
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription canceled
 */
router.post('/subscription/cancel', requireAuth, async (req, res) => {
  try {
    const subscription = await stripeService.cancelSubscription(req.user.id);
    
    res.json({
      message: 'Subscription will be canceled at the end of the current billing period',
      cancelAt: subscription.cancel_at
    });
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    res.status(500).json({ 
      message: 'Failed to cancel subscription',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/v1/payments/subscription/resume:
 *   post:
 *     summary: Resume canceled subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription resumed
 */
router.post('/subscription/resume', requireAuth, async (req, res) => {
  try {
    await stripeService.resumeSubscription(req.user.id);
    
    res.json({
      message: 'Subscription resumed successfully'
    });
  } catch (error) {
    logger.error('Error resuming subscription:', error);
    res.status(500).json({ 
      message: 'Failed to resume subscription',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const payments = await db('payments')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const total = await db('payments')
      .where('user_id', req.user.id)
      .count('* as count')
      .first();
    
    res.json({
      payments,
      total: parseInt(total.count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    res.status(500).json({ 
      message: 'Failed to fetch payment history' 
    });
  }
});

/**
 * Stripe webhook endpoint
 * Must be configured with raw body parser
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    const result = await stripeService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ 
      message: 'Webhook error',
      error: error.message 
    });
  }
});

module.exports = router;
