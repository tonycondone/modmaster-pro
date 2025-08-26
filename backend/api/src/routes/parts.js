const express = require('express');
const router = express.Router();
const Part = require('../models/Part');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { validations, commonValidations } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/parts/search:
 *   get:
 *     summary: Search parts
 *     tags: [Parts]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: manufacturer
 *         schema:
 *           type: string
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *       - in: query
 *         name: compatibility_vehicle_id
 *         schema:
 *           type: string
 *         description: Filter by vehicle compatibility
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search',
  optionalAuth,
  rateLimiters.search,
  asyncHandler(async (req, res) => {
    const {
      q,
      page = 1,
      limit = 20,
      sort = 'trending_score:desc',
      category,
      subcategory,
      manufacturer,
      brand,
      min_price,
      max_price,
      min_rating,
      brand_tier,
      compatibility_vehicle_id,
    } = req.query;

    // Cache key for search results
    const cacheKey = `parts:search:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    const result = await Part.search(q, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      category,
      subcategory,
      manufacturer,
      brand,
      min_price: min_price ? parseFloat(min_price) : undefined,
      max_price: max_price ? parseFloat(max_price) : undefined,
      min_rating: min_rating ? parseFloat(min_rating) : undefined,
      brand_tier,
      compatibility_vehicle_id,
    });

    // Cache results for 5 minutes
    await cache.set(cacheKey, result, 300);

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/trending:
 *   get:
 *     summary: Get trending parts
 *     tags: [Parts]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of trending parts
 */
router.get('/trending',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { category, limit = 10 } = req.query;

    // Cache key for trending parts
    const cacheKey = `parts:trending:${category || 'all'}:${limit}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const parts = await Part.getTrending({
      category,
      limit: parseInt(limit, 10),
    });

    // Cache for 1 hour
    await cache.set(cacheKey, parts, 3600);

    res.json({
      success: true,
      data: parts,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/categories:
 *   get:
 *     summary: Get all part categories
 *     tags: [Parts]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    // Cache categories
    const cacheKey = 'parts:categories';
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const categories = await Part.getCategories();

    // Cache for 24 hours
    await cache.set(cacheKey, categories, 86400);

    res.json({
      success: true,
      data: categories,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/categories/{category}/subcategories:
 *   get:
 *     summary: Get subcategories for a category
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of subcategories
 */
router.get('/categories/:category/subcategories',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { category } = req.params;

    const cacheKey = `parts:subcategories:${category}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const subcategories = await Part.getSubcategories(category);

    // Cache for 24 hours
    await cache.set(cacheKey, subcategories, 86400);

    res.json({
      success: true,
      data: subcategories,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/manufacturers:
 *   get:
 *     summary: Get manufacturers
 *     tags: [Parts]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of manufacturers
 */
router.get('/manufacturers',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { category } = req.query;

    const cacheKey = `parts:manufacturers:${category || 'all'}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const manufacturers = await Part.getManufacturers(category);

    // Cache for 24 hours
    await cache.set(cacheKey, manufacturers, 86400);

    res.json({
      success: true,
      data: manufacturers,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/compatible/{vehicleId}:
 *   get:
 *     summary: Get parts compatible with a vehicle
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of compatible parts
 */
router.get('/compatible/:vehicleId',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    const { page = 1, limit = 20, category, sort = 'quality_rating:desc' } = req.query;

    const result = await Part.getCompatibleParts(vehicleId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      category,
      sort,
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/{id}:
 *   get:
 *     summary: Get part details
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Part details with compatibility and reviews
 *       404:
 *         description: Part not found
 */
router.get('/:id',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Try cache first
    const cacheKey = `part:${id}:full`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const part = await Part.getFullDetails(id);

    // Cache for 30 minutes
    await cache.set(cacheKey, part, 1800);

    // Log part view
    logger.logBusiness('part_viewed', {
      partId: id,
      userId: req.user?.id,
      partName: part.name,
      category: part.category,
    });

    res.json({
      success: true,
      data: part,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts:
 *   post:
 *     summary: Create new part (admin only)
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - part_number
 *               - name
 *               - category
 *               - manufacturer
 *     responses:
 *       201:
 *         description: Part created successfully
 *       403:
 *         description: Admin access required
 */
router.post('/',
  requireAuth,
  requireRole('admin'),
  validations.createPart,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const part = await Part.create(req.body);

    logger.logBusiness('part_created', {
      partId: part.id,
      partNumber: part.part_number,
      name: part.name,
      createdBy: req.user.id,
    });

    // Clear category caches
    await cache.delByPattern('parts:categories*');
    await cache.delByPattern('parts:manufacturers*');

    res.status(201).json({
      success: true,
      data: part,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/{id}:
 *   put:
 *     summary: Update part (admin only)
 *     tags: [Parts]
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
 *         description: Part updated successfully
 *       403:
 *         description: Admin access required
 */
router.put('/:id',
  requireAuth,
  requireRole('admin'),
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const part = await Part.update(id, req.body);

    logger.logBusiness('part_updated', {
      partId: id,
      updatedBy: req.user.id,
      changes: Object.keys(req.body),
    });

    // Clear part cache
    await cache.del(`part:${id}:full`);
    await cache.delByPattern(`parts:search:*`);

    res.json({
      success: true,
      data: part,
    });
  })
);

/**
 * @swagger
 * /api/v1/parts/{id}/social-mention:
 *   post:
 *     summary: Record social media mention
 *     tags: [Parts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [instagram, youtube, reddit, tiktok, twitter]
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Social mention recorded
 */
router.post('/:id/social-mention',
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { platform, url } = req.body;

    await Part.incrementSocialMentions(id);

    logger.logBusiness('part_social_mention', {
      partId: id,
      platform,
      url,
    });

    res.json({
      success: true,
      message: 'Social mention recorded',
    });
  })
);

module.exports = router;