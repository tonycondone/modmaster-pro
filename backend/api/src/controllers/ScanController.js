const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Scan = require('../models/Scan');
const { uploadToCloudinary } = require('../services/uploadService');
const { processImage } = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * ScanController handles all scan-related operations
 */
class ScanController {
  /**
   * Upload and process a scan image
   */
  static async processScan(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
      }

      const userId = req.user.id;
      const { vehicleId, notes } = req.body;

      try {
        // Upload image to cloud storage
        const imageUpload = await uploadToCloudinary(req.file.path, {
          folder: 'scans',
          resource_type: 'image'
        });

        // Create scan record
        const scanData = {
          userId,
          vehicleId: vehicleId || null,
          imageUrl: imageUpload.secure_url,
          imagePublicId: imageUpload.public_id,
          notes: notes || null,
          status: 'processing'
        };

        const scan = await Scan.create(scanData);

        // Process image with AI service (async)
        processImage(scan.id, imageUpload.secure_url)
          .then(async (results) => {
            await Scan.updateResults(scan.id, {
              status: 'completed',
              results: results,
              processingCompletedAt: new Date()
            });
          })
          .catch(async (error) => {
            logger.error('AI processing error:', error);
            await Scan.updateResults(scan.id, {
              status: 'failed',
              error: error.message,
              processingCompletedAt: new Date()
            });
          });

        // Clean up local file
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.warn('Failed to delete local file:', unlinkError);
        }

        logger.info(`Scan created and processing started: ${scan.id}`);

        res.status(201).json({
          success: true,
          message: 'Scan uploaded and processing started',
          data: { scan }
        });
      } catch (uploadError) {
        // Clean up local file on upload error
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.warn('Failed to delete local file after upload error:', unlinkError);
        }
        throw uploadError;
      }
    } catch (error) {
      logger.error('Process scan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all scans for authenticated user
   */
  static async getUserScans(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 10,
        status,
        vehicleId,
        sort = 'createdAt',
        order = 'DESC'
      } = req.query;

      const filters = {
        userId,
        status,
        vehicleId
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const scans = await Scan.findByUserId(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order: order.toUpperCase()
      });

      res.json({
        success: true,
        data: scans
      });
    } catch (error) {
      logger.error('Get user scans error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get specific scan by ID
   */
  static async getScanById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const scan = await Scan.findById(id);
      
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Check if scan belongs to user
      if (scan.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: { scan }
      });
    } catch (error) {
      logger.error('Get scan by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete a scan
   */
  static async deleteScan(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const scan = await Scan.findById(id);
      
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Check if scan belongs to user
      if (scan.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete from cloud storage if exists
      if (scan.imagePublicId) {
        try {
          await uploadToCloudinary.destroy(scan.imagePublicId);
        } catch (cloudError) {
          logger.warn('Failed to delete image from cloud storage:', cloudError);
        }
      }

      await Scan.delete(id);

      logger.info(`Scan deleted: ${id}`);

      res.json({
        success: true,
        message: 'Scan deleted successfully'
      });
    } catch (error) {
      logger.error('Delete scan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get scan statistics for user
   */
  static async getScanStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await Scan.getUserStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get scan stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Retry failed scan processing
   */
  static async retryScan(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const scan = await Scan.findById(id);
      
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Check if scan belongs to user
      if (scan.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (scan.status !== 'failed') {
        return res.status(400).json({
          success: false,
          message: 'Can only retry failed scans'
        });
      }

      // Update status to processing
      await Scan.updateResults(id, {
        status: 'processing',
        error: null,
        processingCompletedAt: null
      });

      // Retry AI processing
      processImage(scan.id, scan.imageUrl)
        .then(async (results) => {
          await Scan.updateResults(scan.id, {
            status: 'completed',
            results: results,
            processingCompletedAt: new Date()
          });
        })
        .catch(async (error) => {
          logger.error('AI processing retry error:', error);
          await Scan.updateResults(scan.id, {
            status: 'failed',
            error: error.message,
            processingCompletedAt: new Date()
          });
        });

      logger.info(`Scan retry initiated: ${id}`);

      res.json({
        success: true,
        message: 'Scan processing restarted'
      });
    } catch (error) {
      logger.error('Retry scan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update scan notes
   */
  static async updateNotes(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      const scan = await Scan.findById(id);
      
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Check if scan belongs to user
      if (scan.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedScan = await Scan.updateNotes(id, notes);

      logger.info(`Scan notes updated: ${id}`);

      res.json({
        success: true,
        message: 'Notes updated successfully',
        data: { scan: updatedScan }
      });
    } catch (error) {
      logger.error('Update scan notes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = ScanController;