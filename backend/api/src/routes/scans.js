const express = require('express');
const router = express.Router();
const VehicleScan = require('../models/VehicleScan');
const { requireAuth, requireSubscription } = require('../middleware/auth');
const { validations, commonValidations } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

/**
 * @swagger
 * /api/v1/scans:
 *   get:
 *     summary: Get user's scan history
 *     tags: [Scans]
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
 *     responses:
 *       200:
 *         description: List of user's scans
 */
router.get('/',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await VehicleScan.findByUserId(req.user.id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
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
 * /api/v1/scans/stats:
 *   get:
 *     summary: Get user's scan statistics
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scan statistics
 */
router.get('/stats',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const stats = await VehicleScan.getUserStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @swagger
 * /api/v1/scans/recent:
 *   get:
 *     summary: Get recent scans across platform
 *     tags: [Scans]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of recent scans
 */
router.get('/recent',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const scans = await VehicleScan.getRecentScans({
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: scans,
    });
  })
);

/**
 * @swagger
 * /api/v1/scans/{id}:
 *   get:
 *     summary: Get scan details
 *     tags: [Scans]
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
 *         description: Scan details
 *       404:
 *         description: Scan not found
 */
router.get('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const scan = await VehicleScan.getFullDetails(id, req.user.id);

    res.json({
      success: true,
      data: scan,
    });
  })
);

/**
 * @swagger
 * /api/v1/scans:
 *   post:
 *     summary: Create new scan
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scan_type
 *               - images
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *               scan_type:
 *                 type: string
 *                 enum: [engine_bay, vin, part_identification, full_vehicle]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 10
 *     responses:
 *       201:
 *         description: Scan created and processing started
 */
router.post('/',
  requireAuth,
  requireSubscription('basic', 'pro', 'shop'),
  validations.createScan,
  rateLimiters.ai,
  asyncHandler(async (req, res) => {
    // Check scan limits based on tier
    const scanLimits = {
      basic: 10,
      pro: 50,
      shop: -1, // Unlimited
    };

    const userTier = req.user.subscription_tier;
    const limit = scanLimits[userTier];

    if (limit > 0) {
      // Check monthly scan count
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { db } = require('../utils/database');
      const [{ count }] = await db('vehicle_scans')
        .where('user_id', req.user.id)
        .where('created_at', '>=', startOfMonth)
        .count('* as count');

      if (count >= limit) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'SCAN_LIMIT_EXCEEDED',
            message: `Monthly scan limit (${limit}) exceeded for ${userTier} tier`,
          },
        });
      }
    }

    // Create scan
    const scan = await VehicleScan.create(req.user.id, req.body);

    logger.logBusiness('scan_created', {
      userId: req.user.id,
      scanId: scan.id,
      scanType: scan.scan_type,
      vehicleId: scan.vehicle_id,
      imageCount: scan.images.length,
    });

    // Send to AI service for processing
    try {
      await axios.post(`${config.external.aiService.url}/process-scan`, {
        scan_id: scan.id,
        scan_type: scan.scan_type,
        images: scan.images,
        user_id: req.user.id,
        vehicle_id: scan.vehicle_id,
      }, {
        timeout: 5000, // 5 second timeout for initial request
      });
    } catch (error) {
      logger.error('Failed to send scan to AI service:', error);
      // Don't fail the request, scan is created and will be processed later
    }

    res.status(201).json({
      success: true,
      data: scan,
      message: 'Scan created and processing started',
    });
  })
);

/**
 * @swagger
 * /api/v1/scans/{id}/status:
 *   get:
 *     summary: Get scan processing status
 *     tags: [Scans]
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
 *         description: Scan status
 */
router.get('/:id/status',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const scan = await VehicleScan.findById(id);

    // Check ownership
    if (scan.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'Scan not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: scan.id,
        status: scan.status,
        created_at: scan.created_at,
        completed_at: scan.completed_at,
        confidence_score: scan.confidence_score,
        error_message: scan.error_message,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/scans/{id}:
 *   delete:
 *     summary: Delete scan
 *     tags: [Scans]
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
 *         description: Scan deleted successfully
 */
router.delete('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await VehicleScan.delete(id, req.user.id);

    logger.logBusiness('scan_deleted', {
      userId: req.user.id,
      scanId: id,
    });

    res.json({
      success: true,
      message: 'Scan deleted successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/scans/{id}/results:
 *   post:
 *     summary: Update scan results (internal use by AI service)
 *     tags: [Scans]
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
 *               ai_results:
 *                 type: object
 *               detected_parts:
 *                 type: array
 *               detected_modifications:
 *                 type: array
 *               detected_vin:
 *                 type: string
 *               confidence_score:
 *                 type: number
 *               processing_time_ms:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Results updated successfully
 */
router.post('/:id/results',
  // This endpoint should be secured with service-to-service auth
  // For now, using a simple API key check
  (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
        },
      });
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const scan = await VehicleScan.updateResults(id, req.body);

    logger.logBusiness('scan_processed', {
      scanId: id,
      status: scan.status,
      confidenceScore: scan.confidence_score,
      detectedPartsCount: scan.detected_parts?.length || 0,
      processingTime: scan.processing_time_ms,
    });

    res.json({
      success: true,
      data: scan,
    });
  })
);

module.exports = router;