const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/marketplace/prices/{partId}:
 *   get:
 *     summary: Get current prices across marketplaces
 *     tags: [Marketplace]
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Price comparison across platforms
 */
router.get('/prices/:partId',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;

    // Check cache first
    const cacheKey = `marketplace:prices:${partId}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get all marketplace integrations for this part
    const integrations = await db('marketplace_integrations')
      .where({ part_id: partId, is_tracked: true })
      .orderBy('current_price', 'asc');

    // Get part info
    const part = await db('parts')
      .where({ id: partId })
      .select('id', 'name', 'part_number', 'manufacturer', 'msrp')
      .first();

    if (!part) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PART_NOT_FOUND',
          message: 'Part not found',
        },
      });
    }

    // Calculate price statistics
    const prices = integrations
      .filter(i => i.current_price)
      .map(i => i.current_price);

    const priceStats = prices.length > 0 ? {
      lowest: Math.min(...prices),
      highest: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    } : null;

    const result = {
      part,
      integrations: integrations.map(i => ({
        ...i,
        savings: i.original_price ? i.original_price - i.current_price : 0,
        savings_percentage: i.discount_percentage,
      })),
      statistics: priceStats,
      last_updated: integrations[0]?.last_updated_at || null,
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, result, 1800);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @swagger
 * /api/v1/marketplace/deals:
 *   get:
 *     summary: Get current deals and discounts
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: min_discount
 *         schema:
 *           type: number
 *         description: Minimum discount percentage
 *     responses:
 *       200:
 *         description: List of deals
 */
router.get('/deals',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { category, min_discount = 20, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build query for deals
    let query = db('marketplace_integrations as mi')
      .join('parts as p', 'mi.part_id', 'p.id')
      .where('mi.discount_percentage', '>=', min_discount)
      .where('mi.is_tracked', true)
      .where('mi.availability', 'in_stock')
      .where('p.is_active', true);

    if (category) {
      query = query.where('p.category', 'ilike', category);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get deals
    const deals = await query
      .select(
        'mi.*',
        'p.name as part_name',
        'p.part_number',
        'p.category',
        'p.manufacturer',
        'p.images as part_images'
      )
      .orderBy('mi.discount_percentage', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: deals,
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
 * /api/v1/marketplace/track-price:
 *   post:
 *     summary: Set price alert for a part
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - part_id
 *               - target_price
 *             properties:
 *               part_id:
 *                 type: string
 *                 format: uuid
 *               target_price:
 *                 type: number
 *               platform:
 *                 type: string
 *                 enum: [any, amazon, ebay, autozone, summit_racing]
 *     responses:
 *       200:
 *         description: Price alert set
 */
router.post('/track-price',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { part_id, target_price, platform = 'any' } = req.body;

    // Store price alert (simplified for now)
    logger.logBusiness('price_alert_set', {
      userId: req.user.id,
      partId: part_id,
      targetPrice: target_price,
      platform,
    });

    res.json({
      success: true,
      message: 'Price alert has been set',
      data: {
        part_id,
        target_price,
        platform,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/marketplace/refresh-prices/{partId}:
 *   post:
 *     summary: Trigger price refresh for a part
 *     tags: [Marketplace]
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Price refresh initiated
 */
router.post('/refresh-prices/:partId',
  rateLimiters.scraping,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;

    // Clear cache
    await cache.del(`marketplace:prices:${partId}`);

    // In production, this would trigger the scraping service
    logger.logBusiness('price_refresh_requested', {
      partId,
      requestedBy: req.user?.id || 'anonymous',
    });

    res.json({
      success: true,
      message: 'Price refresh initiated',
      data: {
        part_id: partId,
        estimated_time: 60, // seconds
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/marketplace/history/{partId}:
 *   get:
 *     summary: Get price history for a part
 *     tags: [Marketplace]
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Price history data
 */
router.get('/history/:partId',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;
    const { platform, days = 30 } = req.query;

    // Get marketplace integrations
    let query = db('marketplace_integrations')
      .where({ part_id: partId });

    if (platform) {
      query = query.where({ platform });
    }

    const integrations = await query;

    // Aggregate price history from all integrations
    const history = [];
    
    for (const integration of integrations) {
      if (integration.price_history && Array.isArray(integration.price_history)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const platformHistory = integration.price_history
          .filter(h => new Date(h.date) >= cutoffDate)
          .map(h => ({
            ...h,
            platform: integration.platform,
          }));

        history.push(...platformHistory);
      }
    }

    // Sort by date
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        part_id: partId,
        history,
        platforms: integrations.map(i => i.platform),
      },
    });
  })
);

module.exports = router;