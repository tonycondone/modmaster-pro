const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const { sendEmail } = require('../services/emailService');
const { generateTokens, verifyRefreshToken } = require('../utils/auth');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const redis = require('../utils/redis');

class AuthController {
  /**
   * User Registration
   * @route POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const {
        email,
        username,
        password,
        first_name,
        last_name,
        phone,
        preferences
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new ValidationError('Email already registered');
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        throw new ValidationError('Username already taken');
      }

      // Create new user
      const user = await User.create({
        email,
        username,
        password,
        first_name,
        last_name,
        phone,
        preferences: preferences || {}
      });

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await User.update(user.id, { verification_token: verificationToken });

      // Send verification email
      await sendEmail({
        to: email,
        subject: 'Verify Your ModMaster Pro Account',
        template: 'email-verification',
        data: {
          name: first_name,
          verificationLink: `${config.app.frontendUrl}/verify-email?token=${verificationToken}`
        }
      });

      // Generate JWT tokens
      const tokens = generateTokens(user);

      // Log successful registration
      logger.info('User registered successfully', { userId: user.id, email });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email_verified: false
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   * @route POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { email, password, rememberMe } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new ValidationError('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await User.verifyPassword(user.id, password);
      if (!isPasswordValid) {
        // Log failed login attempt
        await User.logLoginAttempt(user.id, false, req.ip);
        throw new ValidationError('Invalid credentials');
      }

      // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        throw new AppError('Account is temporarily locked due to multiple failed login attempts', 423);
      }

      // Check if email is verified
      if (!user.email_verified && config.auth.requireEmailVerification) {
        throw new AppError('Please verify your email before logging in', 403);
      }

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        // Generate 2FA session token
        const twoFactorToken = crypto.randomBytes(32).toString('hex');
        await redis.setex(
          `2fa_session:${twoFactorToken}`,
          300, // 5 minutes
          JSON.stringify({ userId: user.id, ip: req.ip })
        );

        return res.json({
          success: true,
          message: 'Please enter your 2FA code',
          data: {
            requiresTwoFactor: true,
            sessionToken: twoFactorToken
          }
        });
      }

      // Generate tokens
      const tokens = generateTokens(user, rememberMe);

      // Update last login
      await User.update(user.id, {
        last_login_at: new Date(),
        last_login_ip: req.ip
      });

      // Log successful login
      await User.logLoginAttempt(user.id, true, req.ip);
      logger.info('User logged in successfully', { userId: user.id, email });

      // Store refresh token in Redis
      await redis.setex(
        `refresh_token:${user.id}:${tokens.refreshToken}`,
        rememberMe ? config.auth.refreshTokenExpiryLong : config.auth.refreshTokenExpiry,
        JSON.stringify({
          userId: user.id,
          createdAt: new Date(),
          ip: req.ip,
          userAgent: req.get('user-agent')
        })
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            role: user.role,
            email_verified: user.email_verified
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 2FA Code
   * @route POST /api/auth/verify-2fa
   */
  static async verify2FA(req, res, next) {
    try {
      const { sessionToken, code } = req.body;

      // Verify session token
      const sessionData = await redis.get(`2fa_session:${sessionToken}`);
      if (!sessionData) {
        throw new ValidationError('Invalid or expired session');
      }

      const { userId } = JSON.parse(sessionData);
      
      // Verify 2FA code
      const isValid = await User.verify2FACode(userId, code);
      if (!isValid) {
        throw new ValidationError('Invalid 2FA code');
      }

      // Get user
      const user = await User.findById(userId);

      // Generate tokens
      const tokens = generateTokens(user);

      // Update last login
      await User.update(userId, {
        last_login_at: new Date(),
        last_login_ip: req.ip
      });

      // Clean up session token
      await redis.del(`2fa_session:${sessionToken}`);

      // Store refresh token
      await redis.setex(
        `refresh_token:${userId}:${tokens.refreshToken}`,
        config.auth.refreshTokenExpiry,
        JSON.stringify({
          userId,
          createdAt: new Date(),
          ip: req.ip,
          userAgent: req.get('user-agent')
        })
      );

      res.json({
        success: true,
        message: '2FA verification successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            role: user.role
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Access Token
   * @route POST /api/auth/refresh
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Check if refresh token exists in Redis
      const tokenData = await redis.get(`refresh_token:${decoded.userId}:${refreshToken}`);
      if (!tokenData) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiry }
      );

      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: config.auth.jwtExpiry
        }
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        next(new AppError('Refresh token expired', 401));
      } else {
        next(error);
      }
    }
  }

  /**
   * Logout
   * @route POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      // Remove refresh token from Redis
      if (refreshToken) {
        await redis.del(`refresh_token:${userId}:${refreshToken}`);
      }

      // Blacklist current access token
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.decode(token);
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.setex(`blacklist:${token}`, ttl, '1');
        }
      }

      logger.info('User logged out', { userId });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot Password
   * @route POST /api/auth/forgot-password
   */
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await User.update(user.id, {
        reset_password_token: resetToken,
        reset_password_expires: resetTokenExpiry
      });

      // Send reset email
      await sendEmail({
        to: email,
        subject: 'Reset Your ModMaster Pro Password',
        template: 'password-reset',
        data: {
          name: user.first_name,
          resetLink: `${config.app.frontendUrl}/reset-password?token=${resetToken}`
        }
      });

      logger.info('Password reset requested', { userId: user.id });

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset Password
   * @route POST /api/auth/reset-password
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      const user = await User.findByResetToken(token);
      if (!user) {
        throw new ValidationError('Invalid or expired reset token');
      }

      // Update password
      await User.updatePassword(user.id, password);

      // Clear reset token
      await User.update(user.id, {
        reset_password_token: null,
        reset_password_expires: null
      });

      // Send confirmation email
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Successful',
        template: 'password-reset-success',
        data: {
          name: user.first_name
        }
      });

      logger.info('Password reset successful', { userId: user.id });

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Email
   * @route GET /api/auth/verify-email/:token
   */
  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;

      const user = await User.findByVerificationToken(token);
      if (!user) {
        throw new ValidationError('Invalid or expired verification token');
      }

      // Update user
      await User.update(user.id, {
        email_verified: true,
        email_verified_at: new Date(),
        verification_token: null
      });

      logger.info('Email verified', { userId: user.id });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend Verification Email
   * @route POST /api/auth/resend-verification
   */
  static async resendVerification(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.json({
          success: true,
          message: 'If the email exists and is unverified, a verification email has been sent.'
        });
      }

      if (user.email_verified) {
        return res.json({
          success: true,
          message: 'Email is already verified'
        });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await User.update(user.id, { verification_token: verificationToken });

      // Send verification email
      await sendEmail({
        to: email,
        subject: 'Verify Your ModMaster Pro Account',
        template: 'email-verification',
        data: {
          name: user.first_name,
          verificationLink: `${config.app.frontendUrl}/verify-email?token=${verificationToken}`
        }
      });

      res.json({
        success: true,
        message: 'If the email exists and is unverified, a verification email has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Password (Authenticated)
   * @route POST /api/auth/change-password
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Verify current password
      const isValid = await User.verifyPassword(userId, currentPassword);
      if (!isValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Update password
      await User.updatePassword(userId, newPassword);

      // Send notification email
      const user = await User.findById(userId);
      await sendEmail({
        to: user.email,
        subject: 'Password Changed Successfully',
        template: 'password-changed',
        data: {
          name: user.first_name,
          changedAt: new Date().toLocaleString()
        }
      });

      logger.info('Password changed', { userId });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;