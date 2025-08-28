const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');
const logger = require('../utils/logger');
const config = require('../config');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error) => {
  if (error) {
    logger.error('Email transporter configuration error:', error);
  } else {
    logger.info('Email server is ready to send messages');
  }
});

/**
 * Load and compile email template
 */
async function loadTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(templateContent);
  } catch (error) {
    logger.error(`Failed to load email template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Send email
 */
async function sendEmail({ to, subject, template, data, attachments = [] }) {
  try {
    // Load and compile template
    const compiledTemplate = await loadTemplate(template);
    const html = compiledTemplate({
      ...data,
      appName: config.app.name,
      appUrl: config.app.frontendUrl,
      currentYear: new Date().getFullYear()
    });

    // Email options
    const mailOptions = {
      from: `${config.app.name} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to,
      subject
    });

    return info;
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Send bulk emails
 */
async function sendBulkEmails(recipients, subject, template, commonData = {}) {
  const results = await Promise.allSettled(
    recipients.map(recipient => 
      sendEmail({
        to: recipient.email,
        subject,
        template,
        data: { ...commonData, ...recipient.data }
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info('Bulk email send completed', { successful, failed, total: recipients.length });

  return { successful, failed, results };
}

/**
 * Queue email for sending
 */
async function queueEmail(emailData) {
  // This would integrate with a job queue like Bull or BeeQueue
  // For now, send immediately
  return sendEmail(emailData);
}

module.exports = {
  sendEmail,
  sendBulkEmails,
  queueEmail
};