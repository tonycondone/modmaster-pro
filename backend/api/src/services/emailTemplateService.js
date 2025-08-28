const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const { sendEmail } = require('./emailService');
const logger = require('../utils/logger');

// Template cache to avoid reading files on every request
const templateCache = new Map();

// Template configurations with required fields
const templateConfigs = {
  'welcome': {
    subject: 'Welcome to ModMaster Pro!',
    requiredFields: ['firstName', 'verificationUrl', 'unsubscribeUrl', 'preferencesUrl']
  },
  'password-reset': {
    subject: 'Password Reset Request - ModMaster Pro',
    requiredFields: ['firstName', 'resetLink']
  },
  'email-verification': {
    subject: 'Verify Your Email - ModMaster Pro',
    requiredFields: ['firstName', 'verifyLink', 'verifyCode', 'expirationTime', 'userEmail']
  },
  'maintenance-reminder': {
    subject: 'Maintenance Reminder for Your {{vehicleInfo.year}} {{vehicleInfo.make}} {{vehicleInfo.model}}',
    requiredFields: ['firstName', 'vehicleInfo', 'maintenanceType', 'scheduleLink', 'viewMaintenanceLink', 'notificationSettingsLink'],
    optionalFields: ['urgency', 'recommendedParts', 'maintenanceHistory', 'allPartsLink']
  },
  'order-confirmation': {
    subject: 'Order Confirmation #{{orderDetails.orderNumber}} - ModMaster Pro',
    requiredFields: ['orderDetails', 'itemizedList', 'shippingInfo', 'orderStatusLink', 'shopMoreLink', 'returnPolicyLink'],
    optionalFields: ['trackingNumber', 'trackingLink']
  },
  'scan-results': {
    subject: 'Your AI Scan Results Are Ready - ModMaster Pro',
    requiredFields: ['firstName', 'scanImage', 'scanDate', 'identifiedParts', 'viewAllPartsLink', 'scanAgainLink', 'feedbackLink', 'scanHistoryLink', 'privacyLink'],
    optionalFields: ['recommendations', 'compatibleVehicles']
  }
};

// Register Handlebars helpers
handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('gte', (a, b) => a >= b);
handlebars.registerHelper('if', function(conditional, options) {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

/**
 * Email Template Service
 * Handles rendering and sending of templated emails
 */
class EmailTemplateService {
  /**
   * Load and compile a template from file
   * @param {string} templateName - Name of the template file (without .hbs extension)
   * @returns {Function} Compiled Handlebars template function
   */
  async loadTemplate(templateName) {
    try {
      // Check cache first
      if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
      }

      // Load template file
      const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Compile template
      const compiledTemplate = handlebars.compile(templateContent);
      
      // Cache compiled template
      templateCache.set(templateName, compiledTemplate);
      
      return compiledTemplate;
    } catch (error) {
      logger.error('Error loading email template', { 
        templateName, 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`Failed to load template: ${templateName}`);
    }
  }

  /**
   * Render a template with provided data
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data to render in the template
   * @returns {Object} Rendered HTML and subject
   */
  async renderTemplate(templateName, data) {
    try {
      // Validate template exists
      if (!templateConfigs[templateName]) {
        throw new Error(`Unknown template: ${templateName}`);
      }

      // Validate required fields
      this.validateTemplateData(templateName, data);

      // Load and compile template
      const template = await this.loadTemplate(templateName);

      // Render HTML
      const html = template(data);

      // Render subject (may contain dynamic data)
      const subjectTemplate = handlebars.compile(templateConfigs[templateName].subject);
      const subject = subjectTemplate(data);

      logger.info('Template rendered successfully', { templateName });

      return { html, subject };
    } catch (error) {
      logger.error('Error rendering template', { 
        templateName, 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Send a templated email
   * @param {string} to - Recipient email address
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data for the template
   * @param {Object} options - Additional email options
   * @returns {Promise} Email sending result
   */
  async sendTemplatedEmail(to, templateName, data, options = {}) {
    try {
      // Render template
      const { html, subject } = await this.renderTemplate(templateName, data);

      // Prepare email options
      const emailOptions = {
        to,
        subject,
        html,
        ...options
      };

      // Send email
      const result = await sendEmail(emailOptions);

      logger.info('Templated email sent successfully', { 
        to, 
        templateName,
        subject 
      });

      return result;
    } catch (error) {
      logger.error('Error sending templated email', { 
        to,
        templateName,
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Preview a template (for testing/development)
   * @param {string} templateName - Name of the template
   * @param {Object} data - Sample data for preview
   * @returns {Object} HTML preview and subject
   */
  async previewTemplate(templateName, data = {}) {
    try {
      // Use default preview data if not provided
      const previewData = this.getPreviewData(templateName, data);
      
      // Render template
      const { html, subject } = await this.renderTemplate(templateName, previewData);

      return { html, subject, data: previewData };
    } catch (error) {
      logger.error('Error previewing template', { 
        templateName,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate template data has all required fields
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data to validate
   * @throws {Error} If required fields are missing
   */
  validateTemplateData(templateName, data) {
    const config = templateConfigs[templateName];
    if (!config) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const missingFields = [];
    
    // Check required fields
    for (const field of config.requiredFields) {
      if (!this.hasNestedProperty(data, field)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields for template ${templateName}: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Check if object has nested property
   * @param {Object} obj - Object to check
   * @param {string} path - Property path (e.g., 'user.name')
   * @returns {boolean} True if property exists
   */
  hasNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || !current.hasOwnProperty(part)) {
        return false;
      }
      current = current[part];
    }
    
    return true;
  }

  /**
   * Get list of available templates
   * @returns {Array} List of template configurations
   */
  getTemplateList() {
    return Object.keys(templateConfigs).map(name => ({
      name,
      subject: templateConfigs[name].subject,
      requiredFields: templateConfigs[name].requiredFields,
      optionalFields: templateConfigs[name].optionalFields || []
    }));
  }

  /**
   * Test email delivery for a template
   * @param {string} templateName - Name of the template
   * @param {string} testEmail - Email address to send test to
   * @returns {Promise} Test result
   */
  async testEmailDelivery(templateName, testEmail) {
    try {
      // Validate email
      if (!testEmail || !testEmail.includes('@')) {
        throw new Error('Invalid test email address');
      }

      // Get preview data
      const previewData = this.getPreviewData(templateName);
      
      // Add test notice to data
      previewData.testNotice = 'This is a test email from ModMaster Pro';

      // Send test email
      const result = await this.sendTemplatedEmail(
        testEmail, 
        templateName, 
        previewData,
        { 
          subject: `[TEST] ${templateConfigs[templateName].subject}` 
        }
      );

      logger.info('Test email sent successfully', { 
        templateName, 
        testEmail 
      });

      return {
        success: true,
        message: 'Test email sent successfully',
        to: testEmail,
        template: templateName,
        result
      };
    } catch (error) {
      logger.error('Error sending test email', { 
        templateName,
        testEmail,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get preview data for a template
   * @param {string} templateName - Name of the template
   * @param {Object} customData - Custom preview data
   * @returns {Object} Preview data
   */
  getPreviewData(templateName, customData = {}) {
    const baseData = {
      firstName: 'John',
      userEmail: 'john.doe@example.com',
      verificationUrl: 'https://modmasterpro.com/verify?token=sample',
      unsubscribeUrl: 'https://modmasterpro.com/unsubscribe',
      preferencesUrl: 'https://modmasterpro.com/preferences',
      resetLink: 'https://modmasterpro.com/reset-password?token=sample',
      verifyLink: 'https://modmasterpro.com/verify-email?token=sample',
      verifyCode: 'ABC123',
      expirationTime: '24 hours',
      scanDate: new Date().toLocaleDateString(),
      scanHistoryLink: 'https://modmasterpro.com/scan-history',
      privacyLink: 'https://modmasterpro.com/privacy'
    };

    const templateData = {
      'welcome': baseData,
      'password-reset': baseData,
      'email-verification': baseData,
      'maintenance-reminder': {
        ...baseData,
        urgency: 'due',
        vehicleInfo: {
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          vin: '1HGBH41JXMN109186',
          mileage: 45000,
          licensePlate: 'ABC-1234'
        },
        maintenanceType: {
          name: 'Oil Change',
          description: 'Regular oil and filter replacement',
          icon: 'oil-change'
        },
        recommendedParts: [
          {
            name: 'Synthetic Motor Oil 5W-30',
            description: 'Premium full synthetic oil',
            price: '29.99',
            image: 'https://modmasterpro.com/sample/oil.jpg',
            link: 'https://modmasterpro.com/parts/oil-5w30'
          }
        ],
        maintenanceHistory: [
          { date: '10/15/2023', service: 'Oil Change', mileage: 40000 },
          { date: '08/20/2023', service: 'Tire Rotation', mileage: 38000 }
        ],
        scheduleLink: 'https://modmasterpro.com/schedule',
        viewMaintenanceLink: 'https://modmasterpro.com/maintenance',
        allPartsLink: 'https://modmasterpro.com/parts',
        notificationSettingsLink: 'https://modmasterpro.com/notifications'
      },
      'order-confirmation': {
        ...baseData,
        orderDetails: {
          customerName: 'John Doe',
          orderNumber: 'ORD-2024-001234',
          orderDate: new Date().toLocaleDateString(),
          subtotal: '149.97',
          discount: '15.00',
          discountCode: 'SAVE10',
          shipping: '0.00',
          freeShipping: true,
          tax: '12.75',
          total: '147.72'
        },
        itemizedList: [
          {
            name: 'Premium Brake Pads - Front',
            partNumber: 'BP-12345',
            quantity: 1,
            totalPrice: '79.99',
            originalPrice: '89.99',
            vehicleCompatibility: '2020 Toyota Camry',
            image: 'https://modmasterpro.com/sample/brake-pads.jpg'
          },
          {
            name: 'Brake Rotors - Front Pair',
            partNumber: 'BR-67890',
            quantity: 1,
            totalPrice: '69.98',
            image: 'https://modmasterpro.com/sample/rotors.jpg'
          }
        ],
        shippingInfo: {
          name: 'John Doe',
          address1: '123 Main Street',
          address2: 'Apt 4B',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          country: 'USA',
          method: 'Standard Shipping (5-7 business days)',
          estimatedDelivery: 'January 15-17, 2024'
        },
        trackingNumber: '1Z999AA1234567890',
        trackingLink: 'https://track.example.com/1Z999AA1234567890',
        orderStatusLink: 'https://modmasterpro.com/orders/ORD-2024-001234',
        shopMoreLink: 'https://modmasterpro.com/parts',
        returnPolicyLink: 'https://modmasterpro.com/returns'
      },
      'scan-results': {
        ...baseData,
        scanImage: 'https://modmasterpro.com/sample/scan-image.jpg',
        identifiedParts: [
          {
            name: 'Brake Caliper - Front Right',
            partNumber: 'BC-12345',
            category: 'Brakes',
            confidence: 95,
            priceRange: '89.99',
            image: 'https://modmasterpro.com/sample/caliper.jpg',
            link: 'https://modmasterpro.com/parts/brake-caliper'
          },
          {
            name: 'Brake Rotor',
            partNumber: 'BR-67890',
            category: 'Brakes',
            confidence: 78,
            priceRange: '45.99',
            image: 'https://modmasterpro.com/sample/rotor.jpg',
            link: 'https://modmasterpro.com/parts/brake-rotor'
          }
        ],
        recommendations: [
          'Consider replacing brake pads when replacing calipers',
          'Check brake fluid levels after installation',
          'Professional installation recommended for brake components'
        ],
        compatibleVehicles: [
          { year: 2020, make: 'Toyota', model: 'Camry' },
          { year: 2019, make: 'Honda', model: 'Accord' }
        ],
        viewAllPartsLink: 'https://modmasterpro.com/parts',
        scanAgainLink: 'https://modmasterpro.com/scan',
        feedbackLink: 'https://modmasterpro.com/feedback'
      }
    };

    return { ...templateData[templateName], ...customData };
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache() {
    templateCache.clear();
    logger.info('Template cache cleared');
  }
}

// Export singleton instance
module.exports = new EmailTemplateService();