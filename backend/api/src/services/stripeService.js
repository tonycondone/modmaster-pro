const Stripe = require('stripe');
const config = require('../config');
const logger = require('../utils/logger');
const { User, Subscription, Payment } = require('../models');

class StripeService {
  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16'
    });
    
    this.productIds = {
      basic: config.stripe.products.basic,
      pro: config.stripe.products.pro,
      enterprise: config.stripe.products.enterprise
    };
    
    this.priceIds = {
      basic_monthly: config.stripe.prices.basic_monthly,
      basic_yearly: config.stripe.prices.basic_yearly,
      pro_monthly: config.stripe.prices.pro_monthly,
      pro_yearly: config.stripe.prices.pro_yearly,
      enterprise_monthly: config.stripe.prices.enterprise_monthly,
      enterprise_yearly: config.stripe.prices.enterprise_yearly
    };
  }

  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(user) {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id,
          username: user.username
        }
      });

      // Update user with Stripe customer ID
      await user.update({ stripeCustomerId: customer.id });

      logger.info(`Stripe customer created for user ${user.id}: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(userId, plan, interval = 'monthly') {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Ensure user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(user);
        customerId = customer.id;
      }

      const priceId = this.priceIds[`${plan}_${interval}`];
      if (!priceId) {
        throw new Error(`Invalid plan or interval: ${plan}_${interval}`);
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${config.app.frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.app.frontendUrl}/subscription/cancel`,
        metadata: {
          userId,
          plan,
          interval
        },
        subscription_data: {
          trial_period_days: plan === 'pro' ? 14 : 0,
          metadata: {
            userId,
            plan
          }
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto'
        }
      });

      logger.info(`Checkout session created for user ${userId}: ${session.id}`);
      return session;
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.stripeCustomerId) {
        throw new Error('User not found or no Stripe customer');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${config.app.frontendUrl}/profile/billing`
      });

      logger.info(`Billing portal session created for user ${userId}`);
      return session;
    } catch (error) {
      logger.error('Error creating billing portal session:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload, signature) {
    let event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }

    logger.info(`Handling webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event.data.object);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle successful checkout
   */
  async handleCheckoutSessionCompleted(session) {
    try {
      const userId = session.metadata.userId;
      const user = await User.findByPk(userId);
      
      if (!user) {
        logger.error(`User not found for checkout session: ${userId}`);
        return;
      }

      // Subscription will be handled by subscription webhook
      logger.info(`Checkout completed for user ${userId}`);
      
      // Send confirmation email
      await emailService.sendSubscriptionConfirmation(user.email, {
        plan: session.metadata.plan,
        interval: session.metadata.interval
      });
    } catch (error) {
      logger.error('Error handling checkout session completed:', error);
    }
  }

  /**
   * Handle subscription updates
   */
  async handleSubscriptionUpdate(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findByPk(userId);
      
      if (!user) {
        logger.error(`User not found for subscription: ${userId}`);
        return;
      }

      // Determine plan from price ID
      let plan = 'free';
      const priceId = subscription.items.data[0]?.price.id;
      
      for (const [key, value] of Object.entries(this.priceIds)) {
        if (value === priceId) {
          plan = key.split('_')[0];
          break;
        }
      }

      // Update or create subscription record
      const [dbSubscription, created] = await Subscription.findOrCreate({
        where: { stripeSubscriptionId: subscription.id },
        defaults: {
          userId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status: subscription.status,
          plan,
          interval: subscription.items.data[0]?.price.recurring?.interval || 'monthly',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
        }
      });

      if (!created) {
        await dbSubscription.update({
          status: subscription.status,
          plan,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
        });
      }

      // Update user subscription tier
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        await user.update({ subscriptionTier: plan });
      }

      logger.info(`Subscription ${created ? 'created' : 'updated'} for user ${userId}: ${plan}`);
    } catch (error) {
      logger.error('Error handling subscription update:', error);
    }
  }

  /**
   * Handle subscription deletion
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      const dbSubscription = await Subscription.findOne({
        where: { stripeSubscriptionId: subscription.id }
      });

      if (!dbSubscription) {
        logger.warn(`Subscription not found in database: ${subscription.id}`);
        return;
      }

      const user = await User.findByPk(dbSubscription.userId);
      
      // Update subscription status
      await dbSubscription.update({ 
        status: 'canceled',
        canceledAt: new Date()
      });

      // Downgrade user to free tier
      if (user) {
        await user.update({ subscriptionTier: 'free' });
        
        // Send cancellation email
        await emailService.sendSubscriptionCanceled(user.email, {
          plan: dbSubscription.plan
        });
      }

      logger.info(`Subscription canceled for user ${dbSubscription.userId}`);
    } catch (error) {
      logger.error('Error handling subscription deleted:', error);
    }
  }

  /**
   * Handle successful invoice payment
   */
  async handleInvoicePaymentSucceeded(invoice) {
    try {
      const subscription = await Subscription.findOne({
        where: { stripeSubscriptionId: invoice.subscription }
      });

      if (!subscription) {
        logger.warn(`Subscription not found for invoice: ${invoice.subscription}`);
        return;
      }

      // Record payment
      await Payment.create({
        userId: subscription.userId,
        stripePaymentIntentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        status: 'succeeded',
        description: `Subscription payment for ${subscription.plan} plan`,
        metadata: {
          subscriptionId: subscription.id,
          invoiceNumber: invoice.number,
          billingPeriod: {
            start: new Date(invoice.period_start * 1000),
            end: new Date(invoice.period_end * 1000)
          }
        }
      });

      // Send receipt
      const user = await User.findByPk(subscription.userId);
      if (user) {
        await emailService.sendPaymentReceipt(user.email, {
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          invoiceUrl: invoice.hosted_invoice_url
        });
      }

      logger.info(`Payment succeeded for subscription ${subscription.id}: $${invoice.amount_paid / 100}`);
    } catch (error) {
      logger.error('Error handling invoice payment succeeded:', error);
    }
  }

  /**
   * Handle failed invoice payment
   */
  async handleInvoicePaymentFailed(invoice) {
    try {
      const subscription = await Subscription.findOne({
        where: { stripeSubscriptionId: invoice.subscription }
      });

      if (!subscription) {
        logger.warn(`Subscription not found for failed invoice: ${invoice.subscription}`);
        return;
      }

      // Record failed payment
      await Payment.create({
        userId: subscription.userId,
        stripePaymentIntentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'failed',
        description: `Failed subscription payment for ${subscription.plan} plan`,
        failureReason: invoice.last_payment_error?.message
      });

      // Send payment failed email
      const user = await User.findByPk(subscription.userId);
      if (user) {
        await emailService.sendPaymentFailed(user.email, {
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          updatePaymentUrl: `${config.app.frontendUrl}/profile/billing`
        });
      }

      logger.warn(`Payment failed for subscription ${subscription.id}`);
    } catch (error) {
      logger.error('Error handling invoice payment failed:', error);
    }
  }

  /**
   * Handle trial ending soon
   */
  async handleTrialWillEnd(subscription) {
    try {
      const dbSubscription = await Subscription.findOne({
        where: { stripeSubscriptionId: subscription.id }
      });

      if (!dbSubscription) {
        logger.warn(`Subscription not found for trial ending: ${subscription.id}`);
        return;
      }

      const user = await User.findByPk(dbSubscription.userId);
      if (user) {
        await emailService.sendTrialEndingReminder(user.email, {
          plan: dbSubscription.plan,
          trialEndDate: new Date(subscription.trial_end * 1000),
          upgradeUrl: `${config.app.frontendUrl}/subscription`
        });
      }

      logger.info(`Trial ending reminder sent for user ${dbSubscription.userId}`);
    } catch (error) {
      logger.error('Error handling trial will end:', error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        where: { userId, status: 'active' }
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel at period end
      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      await subscription.update({
        cancelAtPeriodEnd: true
      });

      logger.info(`Subscription set to cancel for user ${userId}`);
      return stripeSubscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        where: { userId, status: 'active', cancelAtPeriodEnd: true }
      });

      if (!subscription) {
        throw new Error('No subscription to resume');
      }

      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: false }
      );

      await subscription.update({
        cancelAtPeriodEnd: false
      });

      logger.info(`Subscription resumed for user ${userId}`);
      return stripeSubscription;
    } catch (error) {
      logger.error('Error resuming subscription:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();