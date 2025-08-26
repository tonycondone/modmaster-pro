const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validations, handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, shop_owner, moderator]
 *       - in: query
 *         name: subscription_tier
 *         schema:
 *           type: string
 *           enum: [free, basic, pro, shop]
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Insufficient permissions
 */
router.get('/',
  requireAuth,
  requireRole('admin', 'moderator'),
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20, role, subscription_tier } = req.query;

    const result = await User.search(q, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      role,
      subscription_tier,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user can access this profile
    if (req.user.id !== id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const user = await User.findById(id);
    
    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Remove sensitive data
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_password_token;
    delete user.two_factor_secret;

    // Get user stats if viewing own profile
    let stats = null;
    if (req.user.id === id) {
      stats = await User.getStats(id);
    }

    res.json({
      success: true,
      data: {
        user,
        stats,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.put('/:id',
  requireAuth,
  validations.updateUser,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user can update this profile
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const updatedUser = await User.update(id, req.body);

    logger.logBusiness('user_updated', {
      userId: id,
      updatedBy: req.user.id,
      changes: Object.keys(req.body),
    });

    res.json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.delete('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user can delete this profile
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    await User.delete(id);

    logger.logBusiness('user_deleted', {
      userId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password incorrect
 *       403:
 *         description: Access denied
 */
router.post('/:id/change-password',
  requireAuth,
  rateLimiters.passwordReset,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    // Users can only change their own password
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }

    // Update password
    await User.update(id, { password: new_password });

    logger.logSecurity('password_changed', {
      userId: id,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}/upgrade-subscription:
 *   post:
 *     summary: Upgrade user subscription
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tier
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [basic, pro, shop]
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       403:
 *         description: Access denied
 */
router.post('/:id/upgrade-subscription',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tier } = req.body;

    // Users can only upgrade their own subscription
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Calculate expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await User.update(id, {
      subscription_tier: tier,
      subscription_expires_at: expiryDate,
    });

    logger.logBusiness('subscription_upgraded', {
      userId: id,
      tier,
      expiresAt: expiryDate,
    });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        subscription_tier: tier,
        expires_at: expiryDate,
      },
    });
  })
);

module.exports = router;