const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const VehicleScan = require('../models/VehicleScan');
const Part = require('../models/Part');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { sendEmail } = require('../services/emailService');
const redis = require('../utils/redis');
const sharp = require('sharp');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { Op } = require('sequelize');

class UserController {
  /**
   * Get current user profile
   * @route GET /api/users/me
   */
  static async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: {
          exclude: ['password_hash', 'verification_token', 'reset_password_token', 'two_factor_secret']
        },
        include: [
          {
            model: Vehicle,
            as: 'vehicles',
            where: { deleted_at: null },
            required: false,
            limit: 5
          }
        ]
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Get user statistics
      const stats = await this.getUserStatistics(userId);

      res.json({
        success: true,
        data: {
          user: {
            ...user.toJSON(),
            statistics: stats
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * @route PUT /api/users/me
   */
  static async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const userId = req.user.id;
      const {
        first_name,
        last_name,
        phone,
        bio,
        location,
        preferences,
        notification_settings
      } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Handle avatar upload if provided
      if (req.files && req.files.avatar) {
        // Delete old avatar if exists
        if (user.avatar_url) {
          await deleteFromCloudinary(user.avatar_url);
        }

        // Process and upload new avatar
        const avatarBuffer = req.files.avatar.data;
        const processedAvatar = await sharp(avatarBuffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 90 })
          .toBuffer();

        const uploadResult = await uploadToCloudinary(
          { data: processedAvatar, mimetype: 'image/jpeg' },
          'avatars'
        );

        req.body.avatar_url = uploadResult.secure_url;
      }

      // Update user
      await user.update({
        first_name,
        last_name,
        phone,
        bio,
        location,
        preferences: { ...user.preferences, ...preferences },
        notification_settings: { ...user.notification_settings, ...notification_settings },
        avatar_url: req.body.avatar_url || user.avatar_url
      });

      // Clear user cache
      await redis.del(`user:${userId}`);

      logger.info('User profile updated', { userId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            ...user.toJSON(),
            password_hash: undefined,
            verification_token: undefined,
            reset_password_token: undefined,
            two_factor_secret: undefined
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user account
   * @route DELETE /api/users/me
   */
  static async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const { password, reason } = req.body;

      // Verify password
      const isValid = await User.verifyPassword(userId, password);
      if (!isValid) {
        throw new ValidationError('Invalid password');
      }

      const user = await User.findByPk(userId);

      // Log deletion reason
      logger.info('User account deletion requested', { userId, reason });

      // Anonymize user data instead of hard delete
      await user.update({
        email: `deleted_${userId}@modmaster.local`,
        username: `deleted_user_${userId}`,
        first_name: 'Deleted',
        last_name: 'User',
        phone: null,
        avatar_url: null,
        bio: null,
        location: null,
        deleted_at: new Date(),
        deletion_reason: reason
      });

      // Send confirmation email
      await sendEmail({
        to: user.email,
        subject: 'Account Deletion Confirmation',
        template: 'account-deleted',
        data: {
          name: user.first_name
        }
      });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * @route GET /api/users/me/statistics
   */
  static async getStatistics(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await this.getUserStatistics(userId);

      res.json({
        success: true,
        data: { statistics: stats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity
   * @route GET /api/users/me/activity
   */
  static async getActivity(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { user_id: userId };

      if (type) {
        whereClause.activity_type = type;
      }

      // Get user activities (assuming an activities table)
      const activities = await UserActivity.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          activities: activities.rows,
          pagination: {
            total: activities.count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(activities.count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification settings
   * @route PUT /api/users/me/notifications
   */
  static async updateNotificationSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      const user = await User.findByPk(userId);
      
      await user.update({
        notification_settings: {
          ...user.notification_settings,
          ...settings
        }
      });

      logger.info('Notification settings updated', { userId });

      res.json({
        success: true,
        message: 'Notification settings updated successfully',
        data: { notification_settings: user.notification_settings }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA
   * @route POST /api/users/me/2fa/enable
   */
  static async enable2FA(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);

      if (user.two_factor_enabled) {
        throw new ValidationError('2FA is already enabled');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `ModMaster Pro (${user.email})`,
        issuer: 'ModMaster Pro'
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Store secret temporarily in Redis
      await redis.setex(
        `2fa_setup:${userId}`,
        600, // 10 minutes
        JSON.stringify({
          secret: secret.base32,
          backup_codes: this.generateBackupCodes()
        })
      );

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qr_code: qrCodeUrl,
          manual_entry_key: secret.base32
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm 2FA setup
   * @route POST /api/users/me/2fa/confirm
   */
  static async confirm2FA(req, res, next) {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      // Get temporary secret from Redis
      const setupData = await redis.get(`2fa_setup:${userId}`);
      if (!setupData) {
        throw new ValidationError('2FA setup session expired');
      }

      const { secret, backup_codes } = JSON.parse(setupData);

      // Verify code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        throw new ValidationError('Invalid verification code');
      }

      // Enable 2FA
      const user = await User.findByPk(userId);
      await user.update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_backup_codes: backup_codes
      });

      // Clean up Redis
      await redis.del(`2fa_setup:${userId}`);

      logger.info('2FA enabled', { userId });

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: { backup_codes }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   * @route POST /api/users/me/2fa/disable
   */
  static async disable2FA(req, res, next) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      // Verify password
      const isValid = await User.verifyPassword(userId, password);
      if (!isValid) {
        throw new ValidationError('Invalid password');
      }

      const user = await User.findByPk(userId);
      
      await user.update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null
      });

      logger.info('2FA disabled', { userId });

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API tokens
   * @route GET /api/users/me/api-tokens
   */
  static async getAPITokens(req, res, next) {
    try {
      const userId = req.user.id;

      const tokens = await APIToken.findAll({
        where: { user_id: userId, revoked_at: null },
        attributes: ['id', 'name', 'scopes', 'last_used_at', 'created_at']
      });

      res.json({
        success: true,
        data: { tokens }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create API token
   * @route POST /api/users/me/api-tokens
   */
  static async createAPIToken(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, scopes = [] } = req.body;

      // Generate token
      const tokenValue = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(tokenValue).digest('hex');

      const token = await APIToken.create({
        user_id: userId,
        name,
        token_hash: hashedToken,
        scopes
      });

      logger.info('API token created', { userId, tokenId: token.id });

      res.status(201).json({
        success: true,
        message: 'API token created successfully',
        data: {
          token: {
            id: token.id,
            name: token.name,
            scopes: token.scopes,
            value: tokenValue // Only shown once
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API token
   * @route DELETE /api/users/me/api-tokens/:tokenId
   */
  static async revokeAPIToken(req, res, next) {
    try {
      const userId = req.user.id;
      const { tokenId } = req.params;

      const token = await APIToken.findOne({
        where: { id: tokenId, user_id: userId, revoked_at: null }
      });

      if (!token) {
        throw new AppError('API token not found', 404);
      }

      await token.update({ revoked_at: new Date() });

      logger.info('API token revoked', { userId, tokenId });

      res.json({
        success: true,
        message: 'API token revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user preferences
   * @route GET /api/users/me/preferences
   */
  static async getPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);

      res.json({
        success: true,
        data: { preferences: user.preferences }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user preferences
   * @route PUT /api/users/me/preferences
   */
  static async updatePreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      const user = await User.findByPk(userId);
      
      await user.update({
        preferences: {
          ...user.preferences,
          ...preferences
        }
      });

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: user.preferences }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export user data
   * @route POST /api/users/me/export
   */
  static async exportUserData(req, res, next) {
    try {
      const userId = req.user.id;
      const { format = 'json' } = req.body;

      // Collect all user data
      const userData = await this.collectUserData(userId);

      let exportData;
      let contentType;
      let filename;

      switch (format) {
        case 'csv':
          exportData = this.generateCSVExport(userData);
          contentType = 'text/csv';
          filename = 'modmaster_user_data.csv';
          break;
        
        default:
          exportData = JSON.stringify(userData, null, 2);
          contentType = 'application/json';
          filename = 'modmaster_user_data.json';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);

      logger.info('User data exported', { userId, format });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Get user statistics
   */
  static async getUserStatistics(userId) {
    const [vehicleCount, scanCount, savedPartsCount] = await Promise.all([
      Vehicle.count({ where: { user_id: userId, deleted_at: null } }),
      VehicleScan.count({ where: { user_id: userId } }),
      Part.count({
        include: [{
          model: User,
          as: 'savedByUsers',
          where: { id: userId },
          attributes: []
        }]
      })
    ]);

    const recentScans = await VehicleScan.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 5,
      attributes: ['id', 'scan_type', 'status', 'created_at']
    });

    return {
      vehicles: vehicleCount,
      total_scans: scanCount,
      saved_parts: savedPartsCount,
      recent_scans: recentScans,
      member_since: await User.findByPk(userId, { attributes: ['created_at'] }).then(u => u.created_at)
    };
  }

  /**
   * Helper: Generate backup codes
   */
  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Helper: Collect all user data for export
   */
  static async collectUserData(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'two_factor_secret'] }
    });

    const [vehicles, scans, savedParts] = await Promise.all([
      Vehicle.findAll({ where: { user_id: userId } }),
      VehicleScan.findAll({ where: { user_id: userId } }),
      Part.findAll({
        include: [{
          model: User,
          as: 'savedByUsers',
          where: { id: userId },
          attributes: []
        }]
      })
    ]);

    return {
      user: user.toJSON(),
      vehicles,
      scans,
      saved_parts: savedParts
    };
  }
}

module.exports = UserController;