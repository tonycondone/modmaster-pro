const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const { generateTokens, comparePassword, authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { authValidation } = require('../validations');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

// @route   POST /api/v1/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', 
  validateRequest(authValidation.register),
  async (req, res, next) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email or username already exists'
          }
        });
      }

      // Create user
      const verificationToken = uuidv4();
      const user = await User.create({
        email,
        username,
        password,
        firstName,
        lastName,
        verificationToken
      });

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      // Generate tokens
      const tokens = generateTokens(user.id);

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
          user: user.toJSON(),
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
  validateRequest(authValidation.login),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Check password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Check if verified
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before logging in'
          }
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const tokens = generateTokens(user.id);

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post('/verify-email',
  validateRequest(authValidation.verifyEmail),
  async (req, res, next) => {
    try {
      const { token } = req.body;

      const user = await User.findOne({ where: { verificationToken: token } });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token'
          }
        });
      }

      user.isVerified = true;
      user.verificationToken = null;
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password',
  validateRequest(authValidation.forgotPassword),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: 'If an account exists, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = uuidv4();
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      logger.info(`Password reset requested for: ${user.email}`);

      res.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password',
  validateRequest(authValidation.resetPassword),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token'
          }
        });
      }

      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      logger.info(`Password reset for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh',
  validateRequest(authValidation.refreshToken),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      const decoded = verifyToken(refreshToken, config.jwt.refreshSecret);
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        });
      }

      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      const tokens = generateTokens(user.id);

      res.json({
        success: true,
        data: { tokens }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicles',
          attributes: ['id', 'make', 'model', 'year', 'nickname']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        stats: {
          vehicleCount: user.vehicles.length,
          scanCount: user.stats.totalScans,
          projectCount: user.stats.totalProjects
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // In a production app, you might want to blacklist the token
    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;