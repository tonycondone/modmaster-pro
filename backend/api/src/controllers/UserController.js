const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { uploadToCloudinary } = require('../services/uploadService');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * UserController handles user profile and account management
 */
class UserController {
  /**
   * Get user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove sensitive data
      delete user.password;
      delete user.twoFactorSecret;
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
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const updateData = req.body;

      // Remove fields that shouldn't be updated here
      delete updateData.password;
      delete updateData.email;
      delete updateData.isEmailVerified;
      delete updateData.isActive;
      delete updateData.twoFactorSecret;

      const updatedUser = await User.updateProfile(userId, updateData);

      // Remove sensitive data
      delete updatedUser.password;
      delete updatedUser.twoFactorSecret;
      delete updatedUser.emailVerificationToken;
      delete updatedUser.passwordResetToken;
      delete updatedUser.refreshToken;

      logger.info(`User profile updated: ${userId}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      logger.error('Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user avatar
   */
  static async updateAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Avatar file is required'
        });
      }

      const userId = req.user.id;

      try {
        // Upload to cloud storage
        const upload = await uploadToCloudinary(req.file.path, {
          folder: 'avatars',
          width: 300,
          height: 300,
          crop: 'fill',
          gravity: 'face'
        });

        // Update user avatar
        await User.updateAvatar(userId, upload.secure_url, upload.public_id);

        logger.info(`User avatar updated: ${userId}`);

        res.json({
          success: true,
          message: 'Avatar updated successfully',
          data: {
            avatarUrl: upload.secure_url
          }
        });
      } catch (uploadError) {
        logger.error('Avatar upload error:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Failed to upload avatar'
        });
      }
    } catch (error) {
      logger.error('Update avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change user password
   */
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.updatePassword(userId, hashedPassword);

      // Clear all refresh tokens (force re-login on all devices)
      await User.updateRefreshToken(userId, null);

      logger.info(`Password changed for user: ${userId}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change user email
   */
  static async changeEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { newEmail, password } = req.body;

      // Get user with password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Check if new email already exists
      const existingUser = await User.findByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Generate email verification token
      const emailVerificationToken = require('crypto').randomBytes(32).toString('hex');

      // Update email and set as unverified
      await User.changeEmail(userId, newEmail, emailVerificationToken);

      // Send verification email
      try {
        await sendEmail({
          to: newEmail,
          subject: 'Verify Your New Email - ModMaster Pro',
          template: 'email-change-verification',
          data: {
            firstName: user.firstName,
            verificationUrl: `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`
          }
        });
      } catch (emailError) {
        logger.error('Failed to send email verification:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email'
        });
      }

      logger.info(`Email change requested for user: ${userId}`);

      res.json({
        success: true,
        message: 'Email updated. Please check your new email for verification.'
      });
    } catch (error) {
      logger.error('Change email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user preferences/settings
   */
  static async getSettings(req, res) {
    try {
      const userId = req.user.id;

      const settings = await User.getSettings(userId);

      res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      logger.error('Get user settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user preferences/settings
   */
  static async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      const updatedSettings = await User.updateSettings(userId, settings);

      logger.info(`User settings updated: ${userId}`);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: { settings: updatedSettings }
      });
    } catch (error) {
      logger.error('Update user settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user activity log
   */
  static async getActivityLog(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type } = req.query;

      const activities = await User.getActivityLog(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type
      });

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      logger.error('Get activity log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Export user data
   */
  static async exportData(req, res) {
    try {
      const userId = req.user.id;

      const userData = await User.exportUserData(userId);

      res.json({
        success: true,
        message: 'User data exported successfully',
        data: userData
      });
    } catch (error) {
      logger.error('Export user data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { password, confirmDeletion } = req.body;

      if (confirmDeletion !== 'DELETE') {
        return res.status(400).json({
          success: false,
          message: 'Please confirm account deletion by typing "DELETE"'
        });
      }

      // Get user with password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Soft delete user account
      await User.softDelete(userId);

      logger.info(`User account deleted: ${userId}`);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = UserController;