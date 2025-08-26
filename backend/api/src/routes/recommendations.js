const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/recommendations:
 *   get:
 *     summary: Get personalized recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [part, bundle, service, maintenance]
 *     responses:
 *       200:
 *         description: List of recommendations
 */
router.get('/',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { vehicle_id, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build query
    let query = db('recommendations as r')
      .where('r.user_id', req.user.id)
      .where('r.is_active', true)
      .where(function() {
        this.whereNull('r.expires_at')
          .orWhere('r.expires_at', '>', new Date());
      });

    if (vehicle_id) {
      query = query.where('r.vehicle_id', vehicle_id);
    }

    if (type) {
      query = query.where('r.recommendation_type', type);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get recommendations with related data
    const recommendations = await query
      .select(
        'r.*',
        'p.name as part_name',
        'p.category as part_category',
        'p.price_min as part_price_min',
        'p.price_max as part_price_max',
        'p.images as part_images',
        'sb.name as bundle_name',
        'sb.total_savings as bundle_savings',
        'sb.bundle_parts as bundle_parts',
        'v.make as vehicle_make',
        'v.model as vehicle_model',
        'v.year as vehicle_year'
      )
      .leftJoin('parts as p', 'r.part_id', 'p.id')
      .leftJoin('smart_bundles as sb', 'r.bundle_id', 'sb.id')
      .leftJoin('vehicles as v', 'r.vehicle_id', 'v.id')
      .orderBy('r.priority', 'desc')
      .orderBy('r.confidence_score', 'desc')
      .limit(limit)
      .offset(offset);

    // Mark as viewed
    const recommendationIds = recommendations.map(r => r.id);
    if (recommendationIds.length > 0) {
      await db('recommendations')
        .whereIn('id', recommendationIds)
        .where('was_viewed', false)
        .update({
          was_viewed: true,
          viewed_at: new Date(),
        });
    }

    res.json({
      success: true,
      data: recommendations,
      pagination: {
        total: parseInt(count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / limit),
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/recommendations/generate:
 *   post:
 *     summary: Generate new recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *               preferences:
 *                 type: object
 *                 properties:
 *                   budget_min:
 *                     type: number
 *                   budget_max:
 *                     type: number
 *                   performance_focus:
 *                     type: string
 *                     enum: [power, handling, aesthetics, efficiency]
 *                   skill_level:
 *                     type: string
 *                     enum: [beginner, intermediate, advanced, expert]
 *     responses:
 *       200:
 *         description: Recommendations generated
 */
router.post('/generate',
  requireAuth,
  rateLimiters.ai,
  asyncHandler(async (req, res) => {
    const { vehicle_id, preferences = {} } = req.body;

    // Log recommendation request
    logger.logBusiness('recommendations_requested', {
      userId: req.user.id,
      vehicleId: vehicle_id,
      preferences,
    });

    // For now, return a simple response
    // In production, this would call the AI service
    res.json({
      success: true,
      message: 'Recommendations are being generated',
      data: {
        status: 'processing',
        estimated_time: 30,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/recommendations/{id}/click:
 *   post:
 *     summary: Track recommendation click
 *     tags: [Recommendations]
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
 *         description: Click tracked
 */
router.post('/:id/click',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await db('recommendations')
      .where({ id, user_id: req.user.id })
      .update({
        was_clicked: true,
        clicked_at: new Date(),
      });

    logger.logBusiness('recommendation_clicked', {
      userId: req.user.id,
      recommendationId: id,
    });

    res.json({
      success: true,
      message: 'Click tracked',
    });
  })
);

/**
 * @swagger
 * /api/v1/recommendations/{id}/dismiss:
 *   post:
 *     summary: Dismiss recommendation
 *     tags: [Recommendations]
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
 *         description: Recommendation dismissed
 */
router.post('/:id/dismiss',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await db('recommendations')
      .where({ id, user_id: req.user.id })
      .update({
        was_dismissed: true,
        dismissed_at: new Date(),
        is_active: false,
      });

    logger.logBusiness('recommendation_dismissed', {
      userId: req.user.id,
      recommendationId: id,
    });

    res.json({
      success: true,
      message: 'Recommendation dismissed',
    });
  })
);

module.exports = router;