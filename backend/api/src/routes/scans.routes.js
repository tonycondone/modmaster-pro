const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Scan, Vehicle, Part } = require('../models');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { scanValidation } = require('../validations');
const { uploadImage } = require('../services/uploadService');
const { queue } = require('../services/queueService');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

// @route   POST /api/v1/scans/process
// @desc    Upload and process a vehicle scan
// @access  Private
router.post('/process',
  authenticate,
  validateRequest(scanValidation.create),
  async (req, res, next) => {
    try {
      const { vehicleId, scanType, notes } = req.body;

      // Verify vehicle ownership
      const vehicle = await Vehicle.findOne({
        where: {
          id: vehicleId,
          userId: req.user.id
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VEHICLE_NOT_FOUND',
            message: 'Vehicle not found or access denied'
          }
        });
      }

      // Handle image upload
      if (!req.files || !req.files.image) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_IMAGE',
            message: 'Image file is required'
          }
        });
      }

      const imageUrls = await uploadImage(req.files.image, 'scans');
      const primaryImageUrl = imageUrls[0];

      // Create scan record
      const scan = await Scan.create({
        userId: req.user.id,
        vehicleId,
        scanType,
        imageUrl: primaryImageUrl,
        notes,
        status: 'pending',
        metadata: {
          uploadInfo: {
            fileName: req.files.image.name,
            fileSize: req.files.image.size,
            mimeType: req.files.image.mimetype
          }
        }
      });

      // Queue for AI processing
      await queue.add('processScan', {
        scanId: scan.id,
        imageUrl: primaryImageUrl,
        scanType,
        vehicleInfo: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year
        }
      }, {
        priority: req.user.subscriptionTier === 'pro' ? 1 : 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      // Update user stats
      await req.user.updateStats('totalScans', 1);

      logger.info(`Scan created: ${scan.id} by user ${req.user.id}`);

      res.status(202).json({
        success: true,
        message: 'Scan uploaded and queued for processing',
        data: {
          scanId: scan.id,
          status: scan.status,
          estimatedProcessingTime: scanType === 'vin' ? 5 : 30 // seconds
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/v1/scans/my-scans
// @desc    Get user's scan history
// @access  Private
router.get('/my-scans', authenticate, async (req, res, next) => {
  try {
    const { 
      vehicleId, 
      scanType, 
      status,
      page = 1, 
      limit = 20,
      sort = 'createdAt:desc'
    } = req.query;

    const where = { userId: req.user.id };
    
    if (vehicleId) where.vehicleId = vehicleId;
    if (scanType) where.scanType = scanType;
    if (status) where.status = status;

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    const scans = await Scan.findAndCountAll({
      where,
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'make', 'model', 'year', 'nickname']
      }],
      order: [[sortField, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: scans.rows,
      pagination: {
        total: scans.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(scans.count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/scans/:id
// @desc    Get scan details
// @access  Private (owner only)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'make', 'model', 'year', 'nickname']
        }
      ]
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'Scan not found'
        }
      });
    }

    // If scan has identified parts, include part details
    let identifiedParts = [];
    if (scan.identifiedParts && scan.identifiedParts.length > 0) {
      const partIds = scan.identifiedParts.map(p => p.partId).filter(Boolean);
      if (partIds.length > 0) {
        const parts = await Part.findAll({
          where: { id: { [Op.in]: partIds } },
          attributes: ['id', 'name', 'partNumber', 'manufacturer', 'category']
        });

        identifiedParts = scan.identifiedParts.map(identifiedPart => {
          const partDetails = parts.find(p => p.id === identifiedPart.partId);
          return {
            ...identifiedPart,
            partDetails: partDetails ? partDetails.toJSON() : null
          };
        });
      }
    }

    res.json({
      success: true,
      data: {
        ...scan.toJSON(),
        identifiedParts
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/scans/:id/status
// @desc    Get scan processing status
// @access  Private (owner only)
router.get('/:id/status', authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      attributes: ['id', 'status', 'progress', 'processingStartedAt', 'processingCompletedAt']
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'Scan not found'
        }
      });
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining = null;
    if (scan.status === 'processing' && scan.processingStartedAt) {
      const elapsedTime = Date.now() - scan.processingStartedAt.getTime();
      const averageProcessingTime = 30000; // 30 seconds average
      estimatedTimeRemaining = Math.max(0, averageProcessingTime - elapsedTime);
    }

    res.json({
      success: true,
      data: {
        scanId: scan.id,
        status: scan.status,
        progress: scan.progress || 0,
        estimatedTimeRemaining,
        processingStartedAt: scan.processingStartedAt,
        processingCompletedAt: scan.processingCompletedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/scans/:id/retry
// @desc    Retry failed scan processing
// @access  Private (owner only)
router.post('/:id/retry', authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: 'failed'
      }
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'Failed scan not found'
        }
      });
    }

    // Reset scan status
    await scan.update({
      status: 'pending',
      error: null,
      progress: 0
    });

    // Re-queue for processing
    await queue.add('processScan', {
      scanId: scan.id,
      imageUrl: scan.imageUrl,
      scanType: scan.scanType,
      retry: true
    });

    logger.info(`Scan retry initiated: ${scan.id}`);

    res.json({
      success: true,
      message: 'Scan queued for retry',
      data: {
        scanId: scan.id,
        status: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/v1/scans/:id
// @desc    Delete a scan
// @access  Private (owner only)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'Scan not found'
        }
      });
    }

    await scan.destroy();

    // Update user stats
    await req.user.updateStats('totalScans', -1);

    logger.info(`Scan deleted: ${req.params.id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Scan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/scans/:id/feedback
// @desc    Submit feedback on scan results
// @access  Private (owner only)
router.post('/:id/feedback',
  authenticate,
  validateRequest(scanValidation.feedback),
  async (req, res, next) => {
    try {
      const { accuracy, misidentifiedParts, missedParts, comments } = req.body;

      const scan = await Scan.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
          status: 'completed'
        }
      });

      if (!scan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SCAN_NOT_FOUND',
            message: 'Completed scan not found'
          }
        });
      }

      // Update scan with feedback
      const feedback = {
        accuracy,
        misidentifiedParts,
        missedParts,
        comments,
        submittedAt: new Date()
      };

      await scan.update({
        feedback,
        metadata: {
          ...scan.metadata,
          hasFeedback: true
        }
      });

      // Queue feedback for ML training improvement
      await queue.add('processFeedback', {
        scanId: scan.id,
        feedback,
        scanType: scan.scanType
      }, {
        priority: 5 // Low priority
      });

      logger.info(`Scan feedback submitted: ${scan.id}`);

      res.json({
        success: true,
        message: 'Thank you for your feedback!'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/v1/scans/stats
// @desc    Get user's scan statistics
// @access  Private
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await Scan.findAll({
      where: { userId: req.user.id },
      attributes: [
        'scanType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', 
          sequelize.literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")
        ), 'successRate']
      ],
      group: ['scanType'],
      raw: true
    });

    const totalScans = await Scan.count({
      where: { userId: req.user.id }
    });

    const recentScans = await Scan.findAll({
      where: {
        userId: req.user.id,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        total: totalScans,
        byType: stats.reduce((acc, stat) => {
          acc[stat.scanType] = {
            count: parseInt(stat.count),
            successRate: parseFloat(stat.successRate)
          };
          return acc;
        }, {}),
        last30Days: recentScans
      }
    });
  } catch (error) {
    next(error);
  }
});

// Internal endpoint for AI service callback
// @route   PUT /api/v1/scans/:id/ai-callback
// @desc    Update scan with AI processing results
// @access  Internal (API key required)
router.put('/:id/ai-callback', async (req, res, next) => {
  try {
    // Verify internal API key
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== config.internalApiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key'
        }
      });
    }

    const {
      status,
      identifiedParts,
      aiAnalysisResults,
      vinData,
      error,
      progress
    } = req.body;

    const scan = await Scan.findByPk(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'Scan not found'
        }
      });
    }

    // Update scan based on status
    const updateData = {
      status,
      progress: progress || 100
    };

    if (status === 'completed') {
      updateData.identifiedParts = identifiedParts;
      updateData.aiAnalysisResults = aiAnalysisResults;
      updateData.processingCompletedAt = new Date();
      
      if (vinData) {
        updateData.vinData = vinData;
        
        // Update vehicle with VIN data if available
        if (vinData.vin && scan.vehicleId) {
          await Vehicle.update(
            { vin: vinData.vin },
            { where: { id: scan.vehicleId } }
          );
        }
      }
    } else if (status === 'failed') {
      updateData.error = error;
      updateData.processingCompletedAt = new Date();
    } else if (status === 'processing') {
      updateData.processingStartedAt = updateData.processingStartedAt || new Date();
    }

    await scan.update(updateData);

    // Send real-time update via websocket
    if (global.io) {
      global.io.to(`user:${scan.userId}`).emit('scanUpdate', {
        scanId: scan.id,
        status: scan.status,
        progress: scan.progress
      });
    }

    logger.info(`Scan updated via AI callback: ${scan.id}, status: ${status}`);

    res.json({
      success: true,
      message: 'Scan updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;