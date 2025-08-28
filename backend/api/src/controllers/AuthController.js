const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/auth');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * AuthController handles all authentication-related operations
 */
class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const userData = {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        emailVerificationToken,
        isEmailVerified: false,
        isActive: true
      };

      const user = await User.create(userData);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Store refresh token
      await User.updateRefreshToken(user.id, refreshToken);

      // Remove sensitive data
      delete user.password;
      delete user.emailVerificationToken;

      logger.info(`User registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * User login
   */
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Store refresh token
      await User.updateRefreshToken(user.id, refreshToken);

      // Remove sensitive data
      delete user.password;
      delete user.emailVerificationToken;
      delete user.passwordResetToken;

      logger.info(`User logged in successfully: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Check if user exists and token matches
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

      // Update refresh token
      await User.updateRefreshToken(user.id, newRefreshToken);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove sensitive data
      delete user.password;
      delete user.emailVerificationToken;
      delete user.passwordResetToken;
      delete user.refreshToken;

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * User logout
   */
  static async logout(req, res) {
    try {
      const userId = req.user.id;

      // Clear refresh token
      await User.updateRefreshToken(userId, null);

      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await User.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }

      // Find user by reset token
      const user = await User.findByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await User.updatePassword(user.id, hashedPassword);
      await User.clearPasswordResetToken(user.id);

      // Clear all refresh tokens (force re-login)
      await User.updateRefreshToken(user.id, null);

      logger.info(`Password reset completed for: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;