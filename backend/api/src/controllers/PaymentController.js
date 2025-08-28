const { validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Part = require('../models/Part');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * PaymentController handles all payment and order operations
 */
class PaymentController {
  /**
   * Create payment intent for order
   */
  static async createPaymentIntent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { items, shippingAddress, billingAddress } = req.body;

      // Validate items and calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const part = await Part.findById(item.partId);
        if (!part) {
          return res.status(404).json({
            success: false,
            message: `Part not found: ${item.partId}`
          });
        }

        if (!part.inStock || part.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for part: ${part.name}`
          });
        }

        const itemTotal = part.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          partId: part.id,
          name: part.name,
          price: part.price,
          quantity: item.quantity,
          total: itemTotal
        });
      }

      // Add shipping cost (basic calculation)
      const shippingCost = totalAmount > 100 ? 0 : 15; // Free shipping over $100
      totalAmount += shippingCost;

      // Create order
      const orderData = {
        userId,
        items: orderItems,
        subtotal: totalAmount - shippingCost,
        shippingCost,
        totalAmount,
        shippingAddress,
        billingAddress,
        status: 'pending'
      };

      const order = await Order.create(orderData);

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          orderId: order.id,
          userId: userId
        }
      });

      // Store payment record
      await Payment.create({
        orderId: order.id,
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: 'usd',
        status: 'pending'
      });

      logger.info(`Payment intent created for order: ${order.id}`);

      res.status(201).json({
        success: true,
        data: {
          order,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        }
      });
    } catch (error) {
      logger.error('Create payment intent error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Confirm payment and complete order
   */
  static async confirmPayment(req, res) {
    try {
      const { paymentIntentId } = req.body;
      const userId = req.user.id;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment intent ID is required'
        });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.metadata.userId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const orderId = paymentIntent.metadata.orderId;
      
      if (paymentIntent.status === 'succeeded') {
        // Update order status
        await Order.updateStatus(orderId, 'confirmed');
        
        // Update payment status
        await Payment.updateStatus(paymentIntentId, 'completed');

        // Update part stock quantities
        const order = await Order.findById(orderId);
        for (const item of order.items) {
          await Part.decrementStock(item.partId, item.quantity);
        }

        // Send confirmation email
        const user = await User.findById(userId);
        try {
          await sendEmail({
            to: user.email,
            subject: 'Order Confirmation - ModMaster Pro',
            template: 'order-confirmation',
            data: {
              firstName: user.firstName,
              order,
              orderUrl: `${process.env.CLIENT_URL}/orders/${orderId}`
            }
          });
        } catch (emailError) {
          logger.error('Failed to send order confirmation email:', emailError);
        }

        logger.info(`Payment confirmed for order: ${orderId}`);

        res.json({
          success: true,
          message: 'Payment confirmed and order processed',
          data: { order }
        });
      } else {
        // Payment failed
        await Order.updateStatus(orderId, 'failed');
        await Payment.updateStatus(paymentIntentId, 'failed');

        res.status(400).json({
          success: false,
          message: 'Payment failed',
          data: { status: paymentIntent.status }
        });
      }
    } catch (error) {
      logger.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 10,
        status,
        sort = 'createdAt',
        order = 'DESC'
      } = req.query;

      const filters = { userId };
      if (status) filters.status = status;

      const orders = await Order.findByUserId(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order: order.toUpperCase()
      });

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      logger.error('Get user orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get specific order by ID
   */
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order belongs to user
      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: { order }
      });
    } catch (error) {
      logger.error('Get order by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order belongs to user
      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled'
        });
      }

      // Get payment record
      const payment = await Payment.findByOrderId(id);
      
      if (payment && payment.stripePaymentIntentId) {
        try {
          // Cancel payment intent or create refund
          if (payment.status === 'pending') {
            await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
          } else if (payment.status === 'completed') {
            await stripe.refunds.create({
              payment_intent: payment.stripePaymentIntentId
            });
          }
        } catch (stripeError) {
          logger.error('Stripe cancellation error:', stripeError);
          // Continue with order cancellation even if Stripe fails
        }
      }

      // Update order status
      await Order.updateStatus(id, 'cancelled');
      
      if (payment) {
        await Payment.updateStatus(payment.stripePaymentIntentId, 'cancelled');
      }

      // Restore stock quantities if order was confirmed
      if (order.status === 'confirmed') {
        for (const item of order.items) {
          await Part.incrementStock(item.partId, item.quantity);
        }
      }

      logger.info(`Order cancelled: ${id}`);

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Process refund for an order
   */
  static async processRefund(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order belongs to user
      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if order can be refunded
      if (order.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be refunded'
        });
      }

      const payment = await Payment.findByOrderId(id);
      
      if (!payment || !payment.stripePaymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment not found'
        });
      }

      try {
        // Create refund in Stripe
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: 'requested_by_customer'
        });

        // Update order and payment status
        await Order.updateStatus(id, 'refunded');
        await Payment.updateStatus(payment.stripePaymentIntentId, 'refunded');

        // Store refund record
        await Payment.createRefund({
          orderId: id,
          paymentId: payment.id,
          stripeRefundId: refund.id,
          amount: refund.amount / 100,
          reason: reason || 'Customer request'
        });

        // Restore stock quantities
        for (const item of order.items) {
          await Part.incrementStock(item.partId, item.quantity);
        }

        logger.info(`Refund processed for order: ${id}`);

        res.json({
          success: true,
          message: 'Refund processed successfully',
          data: { refundId: refund.id }
        });
      } catch (stripeError) {
        logger.error('Stripe refund error:', stripeError);
        res.status(500).json({
          success: false,
          message: 'Failed to process refund'
        });
      }
    } catch (error) {
      logger.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Webhook handler for Stripe events
   */
  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          await Payment.updateStatus(paymentIntent.id, 'completed');
          await Order.updateStatus(paymentIntent.metadata.orderId, 'confirmed');
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          await Payment.updateStatus(failedPaymentIntent.id, 'failed');
          await Order.updateStatus(failedPaymentIntent.metadata.orderId, 'failed');
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
}

module.exports = PaymentController;