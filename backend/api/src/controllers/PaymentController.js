const { validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Part = require('../models/Part');
const Order = require('../models/Order');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { sendEmail } = require('../services/emailService');
const redis = require('../utils/redis');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class PaymentController {
  /**
   * Create payment intent
   * @route POST /api/payments/create-intent
   */
  static async createPaymentIntent(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const userId = req.user.id;
      const {
        amount,
        currency = 'usd',
        items,
        shipping_address,
        billing_address,
        metadata
      } = req.body;

      // Validate amount
      if (amount < 50) { // Stripe minimum is $0.50
        throw new ValidationError('Amount must be at least $0.50');
      }

      // Get or create Stripe customer
      const user = await User.findByPk(userId);
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            user_id: userId
          }
        });
        
        customerId = customer.id;
        await user.update({ stripe_customer_id: customerId });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          user_id: userId,
          order_id: uuidv4(),
          ...metadata
        }
      });

      // Create order record
      const order = await Order.create({
        id: paymentIntent.metadata.order_id,
        user_id: userId,
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        currency,
        items,
        shipping_address,
        billing_address,
        status: 'pending_payment'
      });

      logger.info('Payment intent created', { userId, orderId: order.id, amount });

      res.json({
        success: true,
        data: {
          client_secret: paymentIntent.client_secret,
          order_id: order.id,
          amount,
          currency
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm payment
   * @route POST /api/payments/confirm
   */
  static async confirmPayment(req, res, next) {
    try {
      const { payment_intent_id, order_id } = req.body;
      const userId = req.user.id;

      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

      if (paymentIntent.metadata.user_id !== userId.toString()) {
        throw new AppError('Unauthorized', 403);
      }

      // Update order status
      const order = await Order.findOne({
        where: { id: order_id, user_id: userId }
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (paymentIntent.status === 'succeeded') {
        await order.update({
          status: 'paid',
          paid_at: new Date(),
          stripe_charge_id: paymentIntent.latest_charge
        });

        // Process order items
        await this.processOrderItems(order);

        // Send confirmation email
        await this.sendOrderConfirmation(order);

        logger.info('Payment confirmed', { userId, orderId: order.id });

        res.json({
          success: true,
          message: 'Payment confirmed successfully',
          data: {
            order_id: order.id,
            status: order.status
          }
        });
      } else {
        res.json({
          success: false,
          message: 'Payment not yet confirmed',
          data: {
            status: paymentIntent.status
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment methods
   * @route GET /api/payments/methods
   */
  static async getPaymentMethods(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);

      if (!user.stripe_customer_id) {
        return res.json({
          success: true,
          data: { payment_methods: [] }
        });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripe_customer_id,
        type: 'card'
      });

      res.json({
        success: true,
        data: {
          payment_methods: paymentMethods.data.map(pm => ({
            id: pm.id,
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
            is_default: pm.id === user.default_payment_method_id
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add payment method
   * @route POST /api/payments/methods
   */
  static async addPaymentMethod(req, res, next) {
    try {
      const userId = req.user.id;
      const { payment_method_id, set_as_default } = req.body;

      const user = await User.findByPk(userId);

      // Create Stripe customer if doesn't exist
      if (!user.stripe_customer_id) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            user_id: userId
          }
        });
        
        await user.update({ stripe_customer_id: customer.id });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: user.stripe_customer_id
      });

      // Set as default if requested
      if (set_as_default) {
        await stripe.customers.update(user.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: payment_method_id
          }
        });
        
        await user.update({ default_payment_method_id: payment_method_id });
      }

      logger.info('Payment method added', { userId, paymentMethodId: payment_method_id });

      res.json({
        success: true,
        message: 'Payment method added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove payment method
   * @route DELETE /api/payments/methods/:id
   */
  static async removePaymentMethod(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const user = await User.findByPk(userId);

      if (!user.stripe_customer_id) {
        throw new AppError('No payment methods found', 404);
      }

      // Detach payment method
      await stripe.paymentMethods.detach(id);

      // Update default if this was the default method
      if (user.default_payment_method_id === id) {
        await user.update({ default_payment_method_id: null });
      }

      logger.info('Payment method removed', { userId, paymentMethodId: id });

      res.json({
        success: true,
        message: 'Payment method removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order history
   * @route GET /api/payments/orders
   */
  static async getOrderHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status } = req.query;

      const whereClause = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;

      const orders = await Order.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: Part,
          as: 'items',
          through: {
            attributes: ['quantity', 'price']
          }
        }]
      });

      res.json({
        success: true,
        data: {
          orders: orders.rows,
          pagination: {
            total: orders.count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(orders.count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order details
   * @route GET /api/payments/orders/:id
   */
  static async getOrderDetails(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await Order.findOne({
        where: { id, user_id: userId },
        include: [{
          model: Part,
          as: 'items',
          through: {
            attributes: ['quantity', 'price']
          }
        }]
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Get payment details from Stripe if available
      let paymentDetails = null;
      if (order.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
          paymentDetails = {
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            payment_method: paymentIntent.payment_method_types[0]
          };
        } catch (stripeError) {
          logger.error('Failed to retrieve payment details', { error: stripeError.message });
        }
      }

      res.json({
        success: true,
        data: {
          order: {
            ...order.toJSON(),
            payment_details: paymentDetails
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create subscription
   * @route POST /api/payments/subscriptions
   */
  static async createSubscription(req, res, next) {
    try {
      const userId = req.user.id;
      const { price_id, payment_method_id } = req.body;

      const user = await User.findByPk(userId);

      // Ensure customer exists
      if (!user.stripe_customer_id) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            user_id: userId
          }
        });
        
        await user.update({ stripe_customer_id: customer.id });
      }

      // Attach payment method if provided
      if (payment_method_id) {
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: user.stripe_customer_id
        });

        await stripe.customers.update(user.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: payment_method_id
          }
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripe_customer_id,
        items: [{ price: price_id }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent']
      });

      // Update user subscription status
      await user.update({
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_plan: price_id
      });

      logger.info('Subscription created', { userId, subscriptionId: subscription.id });

      res.json({
        success: true,
        data: {
          subscription_id: subscription.id,
          status: subscription.status,
          client_secret: subscription.latest_invoice.payment_intent?.client_secret
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   * @route POST /api/payments/subscriptions/cancel
   */
  static async cancelSubscription(req, res, next) {
    try {
      const userId = req.user.id;
      const { immediate = false, reason } = req.body;

      const user = await User.findByPk(userId);

      if (!user.subscription_id) {
        throw new AppError('No active subscription found', 404);
      }

      // Cancel subscription
      const subscription = await stripe.subscriptions.update(user.subscription_id, {
        cancel_at_period_end: !immediate,
        cancellation_details: {
          comment: reason
        }
      });

      if (immediate) {
        await stripe.subscriptions.cancel(user.subscription_id);
      }

      // Update user record
      await user.update({
        subscription_status: immediate ? 'canceled' : 'canceling',
        subscription_canceled_at: new Date()
      });

      logger.info('Subscription canceled', { userId, subscriptionId: user.subscription_id, immediate });

      res.json({
        success: true,
        message: immediate ? 'Subscription canceled immediately' : 'Subscription will be canceled at period end',
        data: {
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook
   * @route POST /api/payments/webhook
   */
  static async handleWebhook(req, res, next) {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = config.stripe.webhookSecret;

      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        logger.error('Webhook signature verification failed', { error: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handleInvoicePayment(event.data.object);
          break;
        
        default:
          logger.info('Unhandled webhook event', { type: event.type });
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing error', { error: error.message });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Helper: Process order items
   */
  static async processOrderItems(order) {
    // Update inventory, send to sellers, etc.
    logger.info('Processing order items', { orderId: order.id });
  }

  /**
   * Helper: Send order confirmation
   */
  static async sendOrderConfirmation(order) {
    const user = await User.findByPk(order.user_id);
    
    await sendEmail({
      to: user.email,
      subject: 'Order Confirmation - ModMaster Pro',
      template: 'order-confirmation',
      data: {
        name: user.first_name,
        order_id: order.id,
        amount: order.amount,
        items: order.items
      }
    });
  }

  /**
   * Helper: Handle payment success webhook
   */
  static async handlePaymentSuccess(paymentIntent) {
    const order = await Order.findOne({
      where: { stripe_payment_intent_id: paymentIntent.id }
    });

    if (order && order.status !== 'paid') {
      await order.update({
        status: 'paid',
        paid_at: new Date(),
        stripe_charge_id: paymentIntent.latest_charge
      });

      await this.processOrderItems(order);
      await this.sendOrderConfirmation(order);
    }
  }

  /**
   * Helper: Handle payment failure webhook
   */
  static async handlePaymentFailure(paymentIntent) {
    const order = await Order.findOne({
      where: { stripe_payment_intent_id: paymentIntent.id }
    });

    if (order) {
      await order.update({
        status: 'payment_failed',
        failure_reason: paymentIntent.last_payment_error?.message
      });
    }
  }

  /**
   * Helper: Handle subscription update webhook
   */
  static async handleSubscriptionUpdate(subscription) {
    const user = await User.findOne({
      where: { stripe_customer_id: subscription.customer }
    });

    if (user) {
      await user.update({
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_plan: subscription.items.data[0]?.price.id
      });
    }
  }

  /**
   * Helper: Handle subscription canceled webhook
   */
  static async handleSubscriptionCanceled(subscription) {
    const user = await User.findOne({
      where: { stripe_customer_id: subscription.customer }
    });

    if (user) {
      await user.update({
        subscription_status: 'canceled',
        subscription_ended_at: new Date()
      });

      // Send cancellation email
      await sendEmail({
        to: user.email,
        subject: 'Subscription Canceled - ModMaster Pro',
        template: 'subscription-canceled',
        data: {
          name: user.first_name
        }
      });
    }
  }

  /**
   * Helper: Handle invoice payment webhook
   */
  static async handleInvoicePayment(invoice) {
    logger.info('Invoice paid', { invoiceId: invoice.id, customerId: invoice.customer });
  }
}

module.exports = PaymentController;