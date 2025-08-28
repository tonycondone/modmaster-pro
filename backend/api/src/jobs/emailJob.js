const emailTemplateService = require('../services/emailTemplateService');
const logger = require('../utils/logger');

/**
 * Email job types
 */
const EMAIL_JOB_TYPES = {
  SEND_WELCOME_EMAIL: 'SEND_WELCOME_EMAIL',
  SEND_PASSWORD_RESET: 'SEND_PASSWORD_RESET',
  SEND_MAINTENANCE_REMINDER: 'SEND_MAINTENANCE_REMINDER',
  SEND_BULK_NOTIFICATION: 'SEND_BULK_NOTIFICATION',
  SEND_ORDER_CONFIRMATION: 'SEND_ORDER_CONFIRMATION',
  SEND_EMAIL_VERIFICATION: 'SEND_EMAIL_VERIFICATION',
  SEND_SCAN_RESULTS: 'SEND_SCAN_RESULTS'
};

/**
 * Process email jobs
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} Job result
 */
async function processEmailJob(job) {
  const { type, data } = job.data;
  const startTime = Date.now();

  try {
    logger.info('Processing email job', { 
      jobId: job.id, 
      type,
      to: data.to 
    });

    let result;

    switch (type) {
      case EMAIL_JOB_TYPES.SEND_WELCOME_EMAIL:
        result = await processWelcomeEmail(data, job);
        break;

      case EMAIL_JOB_TYPES.SEND_PASSWORD_RESET:
        result = await processPasswordResetEmail(data, job);
        break;

      case EMAIL_JOB_TYPES.SEND_EMAIL_VERIFICATION:
        result = await processEmailVerification(data, job);
        break;

      case EMAIL_JOB_TYPES.SEND_MAINTENANCE_REMINDER:
        result = await processMaintenanceReminder(data, job);
        break;

      case EMAIL_JOB_TYPES.SEND_ORDER_CONFIRMATION:
        result = await processOrderConfirmation(data, job);
        break;

      case EMAIL_JOB_TYPES.SEND_SCAN_RESULTS:
        result = await processScanResults(data, job);
        break;

      case EMAIL_JOB_TYPES.SEND_BULK_NOTIFICATION:
        result = await processBulkNotification(data, job);
        break;

      default:
        throw new Error(`Unknown email job type: ${type}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Email job completed', { 
      jobId: job.id, 
      type,
      duration,
      result 
    });

    return result;
  } catch (error) {
    logger.error('Email job failed', { 
      jobId: job.id, 
      type,
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Process welcome email
 */
async function processWelcomeEmail(data, job) {
  try {
    const { to, firstName, verificationToken } = data;

    // Update job progress
    await job.progress(20);

    // Prepare template data
    const templateData = {
      firstName,
      verificationUrl: `${process.env.APP_URL}/verify-email?token=${verificationToken}`,
      unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?email=${encodeURIComponent(to)}`,
      preferencesUrl: `${process.env.APP_URL}/email-preferences`
    };

    // Update job progress
    await job.progress(50);

    // Send email
    const result = await emailTemplateService.sendTemplatedEmail(
      to,
      'welcome',
      templateData
    );

    // Update job progress
    await job.progress(100);

    return {
      success: true,
      messageId: result.messageId,
      to
    };
  } catch (error) {
    logger.error('Failed to send welcome email', { 
      to: data.to,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Process password reset email
 */
async function processPasswordResetEmail(data, job) {
  try {
    const { to, firstName, resetToken } = data;

    await job.progress(20);

    const templateData = {
      firstName,
      resetLink: `${process.env.APP_URL}/reset-password?token=${resetToken}`
    };

    await job.progress(50);

    const result = await emailTemplateService.sendTemplatedEmail(
      to,
      'password-reset',
      templateData
    );

    await job.progress(100);

    return {
      success: true,
      messageId: result.messageId,
      to
    };
  } catch (error) {
    logger.error('Failed to send password reset email', { 
      to: data.to,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Process email verification
 */
async function processEmailVerification(data, job) {
  try {
    const { to, firstName, verifyToken, verifyCode } = data;

    await job.progress(20);

    const templateData = {
      firstName,
      verifyLink: `${process.env.APP_URL}/verify-email?token=${verifyToken}`,
      verifyCode,
      expirationTime: '24 hours',
      userEmail: to
    };

    await job.progress(50);

    const result = await emailTemplateService.sendTemplatedEmail(
      to,
      'email-verification',
      templateData
    );

    await job.progress(100);

    return {
      success: true,
      messageId: result.messageId,
      to
    };
  } catch (error) {
    logger.error('Failed to send email verification', { 
      to: data.to,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Process maintenance reminder
 */
async function processMaintenanceReminder(data, job) {
  try {
    const { to, firstName, vehicle, maintenance, urgency } = data;

    await job.progress(20);

    const templateData = {
      firstName,
      urgency,
      vehicleInfo: vehicle,
      maintenanceType: maintenance.type,
      recommendedParts: maintenance.recommendedParts,
      maintenanceHistory: maintenance.history,
      scheduleLink: `${process.env.APP_URL}/schedule-maintenance?vehicleId=${vehicle.id}`,
      viewMaintenanceLink: `${process.env.APP_URL}/vehicles/${vehicle.id}/maintenance`,
      allPartsLink: `${process.env.APP_URL}/parts?vehicle=${vehicle.id}`,
      notificationSettingsLink: `${process.env.APP_URL}/settings/notifications`
    };

    await job.progress(50);

    const result = await emailTemplateService.sendTemplatedEmail(
      to,
      'maintenance-reminder',
      templateData
    );

    await job.progress(100);

    return {
      success: true,
      messageId: result.messageId,
      to,
      vehicleId: vehicle.id
    };
  } catch (error) {
    logger.error('Failed to send maintenance reminder', { 
      to: data.to,
      vehicleId: data.vehicle?.id,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Process order confirmation
 */
async function processOrderConfirmation(data, job) {
  try {
    const { to, order, items, shipping, tracking } = data;

    await job.progress(20);

    const templateData = {
      orderDetails: {
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        subtotal: order.subtotal.toFixed(2),
        discount: order.discount?.toFixed(2),
        discountCode: order.discountCode,
        shipping: order.shippingCost.toFixed(2),
        freeShipping: order.shippingCost === 0,
        tax: order.tax.toFixed(2),
        total: order.total.toFixed(2)
      },
      itemizedList: items.map(item => ({
        name: item.name,
        partNumber: item.partNumber,
        quantity: item.quantity,
        totalPrice: (item.price * item.quantity).toFixed(2),
        originalPrice: item.originalPrice?.toFixed(2),
        vehicleCompatibility: item.vehicleCompatibility,
        image: item.image
      })),
      shippingInfo: shipping,
      trackingNumber: tracking?.trackingNumber,
      trackingLink: tracking?.trackingLink,
      orderStatusLink: `${process.env.APP_URL}/orders/${order.orderNumber}`,
      shopMoreLink: `${process.env.APP_URL}/parts`,
      returnPolicyLink: `${process.env.APP_URL}/return-policy`
    };

    await job.progress(50);

    const result = await emailTemplateService.sendTemplatedEmail(
      to,
      'order-confirmation',
      templateData
    );

    await job.progress(100);

    return {
      success: true,
      messageId: result.messageId,
      to,
      orderNumber: order.orderNumber
    };
  } catch (error) {
    logger.error('Failed to send order confirmation', { 
      to: data.to,
      orderNumber: data.order?.orderNumber,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Process scan results
 */
async function processScanResults(data, job) {
  try {
    const { to, firstName, scan, identifiedParts, recommendations } = data;

    await job.progress(20);

    const templateData = {
      firstName,
      scanImage: scan.imageUrl,
      scanDate: new Date(scan.createdAt).toLocaleDateString(),
      identifiedParts: identifiedParts.map(part => ({
        name: part.name,
        partNumber: part.partNumber,
        category: part.category,
        confidence: Math.round(part.confidence * 100),
        priceRange: part.minPrice.toFixed(2),
        image: part.image,
        link: `${process.env.APP_URL}/parts/${part.id}`
      })),
      recommendations,
      compatibleVehicles: scan.compatibleVehicles,
      viewAllPartsLink: `${process.env.APP_URL}/parts`,
      scanAgainLink: `${process.env.APP_URL}/scan`,
      feedbackLink: `${process.env.APP_URL}/scan-feedback/${scan.id}`,
      scanHistoryLink: `${process.env.APP_URL}/scan-history`,
      privacyLink: `${process.env.APP_URL}/privacy`
    };

    await job.progress(50);

    const result = await emailTemplateService.sendTemplatedEmail(
      to,
      'scan-results',
      templateData
    );

    await job.progress(100);

    return {
      success: true,
      messageId: result.messageId,
      to,
      scanId: scan.id
    };
  } catch (error) {
    logger.error('Failed to send scan results', { 
      to: data.to,
      scanId: data.scan?.id,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Process bulk notification
 */
async function processBulkNotification(data, job) {
  try {
    const { recipients, subject, template, templateData } = data;
    const results = [];
    const failures = [];

    // Update progress based on recipients processed
    const totalRecipients = recipients.length;
    let processedCount = 0;

    for (const recipient of recipients) {
      try {
        const personalizedData = {
          ...templateData,
          firstName: recipient.firstName,
          userEmail: recipient.email
        };

        const result = await emailTemplateService.sendTemplatedEmail(
          recipient.email,
          template,
          personalizedData,
          { subject }
        );

        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        logger.error('Failed to send bulk email to recipient', { 
          email: recipient.email,
          error: error.message 
        });
        
        failures.push({
          email: recipient.email,
          success: false,
          error: error.message
        });
      }

      processedCount++;
      await job.progress(Math.round((processedCount / totalRecipients) * 100));
    }

    return {
      totalSent: results.length,
      totalFailed: failures.length,
      results,
      failures
    };
  } catch (error) {
    logger.error('Failed to process bulk notification', { 
      error: error.message 
    });
    throw error;
  }
}

module.exports = {
  processEmailJob,
  EMAIL_JOB_TYPES
};