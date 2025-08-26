const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Email service initialization - using console logging for development
    logger.info('Email service initialized in development mode');
  }

  async sendEmail(to, subject, html, text) {
    // In development, just log the email
    logger.info('Email would be sent:', {
      to,
      subject,
      preview: text?.substring(0, 100) + '...',
    });

    // Return mock response
    return {
      messageId: `mock-${Date.now()}`,
      accepted: [to],
      rejected: [],
      response: 'Development mode - email logged only',
    };
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${config.app.baseUrl}/verify-email?token=${token}`;
    
    const subject = 'Verify your ModMaster Pro account';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ModMaster Pro</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with ModMaster Pro! To complete your registration, please verify your email address by clicking the button below:</p>
            <center>
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with ModMaster Pro, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ModMaster Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Verify Your ModMaster Pro Account
      
      Thank you for registering! Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
    `;

    return this.sendEmail(email, subject, html, text);
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.app.baseUrl}/reset-password?token=${token}`;
    
    const subject = 'Reset your ModMaster Pro password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .button { display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ModMaster Pro</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ModMaster Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Reset Your ModMaster Pro Password
      
      We received a request to reset your password. Visit this link to create a new password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, you can safely ignore this email.
    `;

    return this.sendEmail(email, subject, html, text);
  }

  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to ModMaster Pro!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .feature { margin: 15px 0; padding: 10px; background-color: white; border-radius: 5px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ModMaster Pro</h1>
          </div>
          <div class="content">
            <h2>Welcome aboard, ${name || 'Car Enthusiast'}!</h2>
            <p>Your ModMaster Pro account is now active. Get ready to transform your ride with our AI-powered modification platform!</p>
            
            <h3>Here's what you can do:</h3>
            <div class="feature">
              <strong>🔍 AI Engine Scanning</strong> - Scan your engine bay to identify parts and get recommendations
            </div>
            <div class="feature">
              <strong>🛒 Real-Time Pricing</strong> - Compare prices across multiple retailers instantly
            </div>
            <div class="feature">
              <strong>🔧 Smart Recommendations</strong> - Get AI-powered suggestions based on your vehicle and goals
            </div>
            <div class="feature">
              <strong>📊 Track Your Build</strong> - Document your modification journey and share with the community
            </div>
            
            <center>
              <a href="${config.app.baseUrl}/dashboard" class="button">Get Started</a>
            </center>
            
            <p>Need help? Check out our <a href="${config.app.baseUrl}/guide">Getting Started Guide</a> or contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ModMaster Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to ModMaster Pro!
      
      Your account is now active. Here's what you can do:
      
      - AI Engine Scanning
      - Real-Time Price Comparison
      - Smart Modification Recommendations
      - Track Your Build Progress
      
      Get started at: ${config.app.baseUrl}/dashboard
      
      Need help? Visit ${config.app.baseUrl}/guide
    `;

    return this.sendEmail(email, subject, html, text);
  }
}

module.exports = new EmailService();