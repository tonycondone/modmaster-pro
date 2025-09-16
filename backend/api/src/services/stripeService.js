const Stripe = require('stripe');
const config = require('../config');
const logger = require('../utils/logger');
const { db } = require('../models');

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
        name: `${user.first_name} ${user.last_name}`,
        metadata: {
          userId: user.id,
          username: user.username
        }
      });

      // Update user with Stripe customer ID
      await db('users')
        .where('id', user.id)
        .update({ stripe_customer_id: customer.id });

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
      const user = await db('users').where('id', userId).first();
      if (!user) {
        throw new Error('User not found');
      }

      // Ensure user has a Stripe customer ID
      let customerId = user.stripe_customer_id;
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
      const user = await db('users').where('id', userId).first();
      if (!user || !user.stripe_customer_id) {
        throw new Error('User not found or no Stripe customer');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
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
      const user = await db('users').where('id', userId).first();
      
      if (!user) {
        logger.error(`User not found for checkout session: ${userId}`);
        return;
      }

      logger.info(`Checkout completed for user ${userId}`);
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
      const user = await db('users').where('id', userId).first();
      
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
      const existingSubscription = await db('subscriptions')
        .where('stripe_subscription_id', subscription.id)
        .first();

      const subscriptionData = {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        plan,
        interval: subscription.items.data[0]?.price.recurring?.interval || 'monthly',
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        updated_at: new Date()
      };

      if (existingSubscription) {
        await db('subscriptions')
          .where('id', existingSubscription.id)
          .update(subscriptionData);
      } else {
        subscriptionData.created_at = new Date();
        await db('subscriptions').insert(subscriptionData);
      }

      // Update user subscription tier
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        await db('users')
          .where('id', userId)
          .update({ subscription_tier: plan });
      }

      logger.info(`Subscription ${existingSubscription ? 'updated' : 'created'} for user ${userId}: ${plan}`);
    } catch (error) {
      logger.error('Error handling subscription update:', error);
    }
  }

  /**
   * Handle subscription deletion
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      const dbSubscription = await db('subscriptions')
        .where('stripe_subscription_id', subscription.id)
        .first();

      if (!dbSubscription) {
        logger.warn(`Subscription not found in database: ${subscription.id}`);
        return;
      }

      const user = await db('users').where('id', dbSubscription.user_id).first();
      
      // Update subscription status
      await db('subscriptions')
        .where('id', dbSubscription.id)
        .update({ 
          status: 'canceled',
          canceled_at: new Date(),
          updated_at: new Date()
        });

      // Downgrade user to free tier
      if (user) {
        await db('users')
          .where('id', dbSubscription.user_id)
          .update({ subscription_tier: 'free' });
      }

      logger.info(`Subscription canceled for user ${dbSubscription.user_id}`);
    } catch (error) {
      logger.error('Error handling subscription deleted:', error);
    }
  }

  /**
   * Handle successful invoice payment
   */
  async handleInvoicePaymentSucceeded(invoice) {
    try {
      const subscription = await db('subscriptions')
        .where('stripe_subscription_id', invoice.subscription)
        .first();

      if (!subscription) {
        logger.warn(`Subscription not found for invoice: ${invoice.subscription}`);
        return;
      }

      // Record payment
      await db('payments').insert({
        user_id: subscription.user_id,
        stripe_payment_intent_id: invoice.payment_intent,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        status: 'succeeded',
        description: `Subscription payment for ${subscription.plan} plan`,
        metadata: JSON.stringify({
          subscriptionId: subscription.id,
          invoiceNumber: invoice.number,
          billingPeriod: {
            start: new Date(invoice.period_start * 1000),
            end: new Date(invoice.period_end * 1000)
          }
        }),
        created_at: new Date(),
        updated_at: new Date()
      });

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
      const subscription = await db('subscriptions')
        .where('stripe_subscription_id', invoice.subscription)
        .first();

      if (!subscription) {
        logger.warn(`Subscription not found for failed invoice: ${invoice.subscription}`);
        return;
      }

      // Record failed payment
      await db('payments').insert({
        user_id: subscription.user_id,
        stripe_payment_intent_id: invoice.payment_intent,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'failed',
        description: `Failed subscription payment for ${subscription.plan} plan`,
        failure_reason: invoice.last_payment_error?.message,
        created_at: new Date(),
        updated_at: new Date()
      });

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
      const dbSubscription = await db('subscriptions')
        .where('stripe_subscription_id', subscription.id)
        .first();

      if (!dbSubscription) {
        logger.warn(`Subscription not found for trial ending: ${subscription.id}`);
        return;
      }

      logger.info(`Trial ending reminder for user ${dbSubscription.user_id}`);
    } catch (error) {
      logger.error('Error handling trial will end:', error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await db('subscriptions')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel at period end
      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

      await db('subscriptions')
        .where('id', subscription.id)
        .update({
          cancel_at_period_end: true,
          updated_at: new Date()
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
      const subscription = await db('subscriptions')
        .where('user_id', userId)
        .where('status', 'active')
        .where('cancel_at_period_end', true)
        .first();

      if (!subscription) {
        throw new Error('No subscription to resume');
      }

      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: false }
      );

      await db('subscriptions')
        .where('id', subscription.id)
        .update({
          cancel_at_period_end: false,
          updated_at: new Date()
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