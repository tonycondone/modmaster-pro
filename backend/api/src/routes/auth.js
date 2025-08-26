const express = require('express');
const router = express.Router();
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyToken, requireAuth } = require('../middleware/auth');
const { validations } = require('../middleware/validation');
const { rateLimiters } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const { cache, session } = require('../utils/redis');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               password:
 *                 type: string
 *                 minLength: 8
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already exists
 */
router.post('/register',
  rateLimiters.auth,
  validations.createUser,
  asyncHandler(async (req, res) => {
    const { email, username, password, first_name, last_name, phone } = req.body;

    // Create user
    const user = await User.create({
      email,
      username,
      password,
      first_name,
      last_name,
      phone,
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.verification_token);

    // Log registration
    logger.logBusiness('user_registered', {
      userId: user.id,
      email: user.email,
      username: user.username,
    });

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
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',
  rateLimiters.auth,
  validations.login,
  asyncHandler(async (req, res, next) => {
    passport.authenticate('local', { session: false }, async (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        logger.logSecurity('failed_login_attempt', {
          email: req.body.email,
          ip: req.ip,
          reason: info?.message,
        });
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: info?.message || 'Invalid credentials',
          },
        });
      }

      // Generate tokens
      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Create session
      const sessionId = uuidv4();
      await session.create(sessionId, {
        userId: user.id,
        refreshToken,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      }, 7 * 24 * 60 * 60); // 7 days

      // Update last login
      await User.updateLastLogin(user.id, req.ip);

      // Log successful login
      logger.logBusiness('user_logged_in', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            subscription_tier: user.subscription_tier,
            avatar_url: user.avatar_url,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '24h',
          },
          sessionId,
        },
      });
    })(req, res, next);
  })
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *               - sessionId
 *             properties:
 *               refreshToken:
 *                 type: string
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { refreshToken, sessionId } = req.body;

    if (!refreshToken || !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Refresh token and session ID are required',
        },
      });
    }

    // Get session
    const sessionData = await session.get(sessionId);
    if (!sessionData || sessionData.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Invalid session or refresh token',
        },
      });
    }

    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      // Get user
      const user = await User.findById(decoded.sub);
      if (!user || !user.is_active) {
        await session.destroy(sessionId);
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
          },
        });
      }

      // Generate new access token
      const newAccessToken = generateToken(user);

      // Update session
      await session.update(sessionId, {
        ...sessionData,
        lastRefreshed: new Date(),
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          expiresIn: '24h',
        },
      });
    } catch (error) {
      await session.destroy(sessionId);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body;

    // Destroy session
    if (sessionId) {
      await session.destroy(sessionId);
    }

    // Blacklist the current token
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = verifyToken(token);
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await cache.set(`blacklist:token:${decoded.jti}`, true, ttl);
        }
      } catch (error) {
        // Token might be invalid, ignore
      }
    }

    logger.logBusiness('user_logged_out', {
      userId: req.user.id,
      sessionId,
    });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid verification token
 */
router.post('/verify-email',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Verification token is required',
        },
      });
    }

    const user = await User.verifyEmail(token);

    logger.logBusiness('email_verified', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/forgot-password',
  rateLimiters.passwordReset,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email is required',
        },
      });
    }

    const result = await User.requestPasswordReset(email);

    // Send reset email if user exists
    if (result.token) {
      await emailService.sendPasswordResetEmail(result.email, result.token);
      
      logger.logBusiness('password_reset_requested', {
        email: result.email,
        ip: req.ip,
      });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link',
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password',
  rateLimiters.passwordReset,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Token and password are required',
        },
      });
    }

    const user = await User.resetPassword(token, password);

    logger.logBusiness('password_reset_completed', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *       401:
 *         description: Not authenticated
 */
router.get('/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Get fresh user data
    const user = await User.findById(req.user.id);
    
    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Get user stats
    const stats = await User.getStats(user.id);

    // Remove sensitive data
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_password_token;
    delete user.two_factor_secret;

    res.json({
      success: true,
      data: {
        user,
        stats,
      },
    });
  })
);

module.exports = router;