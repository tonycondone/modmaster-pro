const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Part, MarketplaceIntegration, Review } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { partValidation } = require('../validations');
const { cache } = require('../services/cacheService');
const logger = require('../utils/logger');
const elasticsearch = require('../services/elasticsearchService');

// @route   GET /api/v1/parts/search
// @desc    Search parts with filters
// @access  Public
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const {
      q,
      category,
      subcategory,
      manufacturer,
      minPrice,
      maxPrice,
      minRating,
      compatibleWith, // vehicle ID
      page = 1,
      limit = 20,
      sort = 'relevance'
    } = req.query;

    // Try to get from cache first
    const cacheKey = `parts:search:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        cached: true
      });
    }

    let results;

    // Use Elasticsearch if available and query is provided
    if (q && elasticsearch.isAvailable()) {
      results = await searchPartsElastic(req.query);
    } else {
      results = await searchPartsSQL(req.query);
    }

    // Cache for 5 minutes
    await cache.set(cacheKey, results, 300);

    // Log search for analytics
    if (req.user) {
      logger.info(`Parts search by user ${req.user.id}: ${q || 'browse'}`);
    }

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/parts/trending
// @desc    Get trending parts
// @access  Public
router.get('/trending', async (req, res, next) => {
  try {
    const { category, limit = 10 } = req.query;

    const cacheKey = `parts:trending:${category || 'all'}:${limit}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const where = { isActive: true };
    if (category) {
      where.category = category;
    }

    const parts = await Part.findAll({
      where,
      order: [
        ['trendingScore', 'DESC'],
        ['viewCount', 'DESC']
      ],
      limit: parseInt(limit),
      include: [{
        model: MarketplaceIntegration,
        as: 'marketplaceIntegrations',
        where: { isTracked: true },
        required: false,
        attributes: ['platform', 'currentPrice', 'availability']
      }]
    });

    // Calculate lowest price for each part
    const partsWithPricing = parts.map(part => {
      const partData = part.toJSON();
      const prices = partData.marketplaceIntegrations
        .map(mi => mi.currentPrice)
        .filter(price => price > 0);
      
      partData.lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
      return partData;
    });

    // Cache for 1 hour
    await cache.set(cacheKey, partsWithPricing, 3600);

    res.json({
      success: true,
      data: partsWithPricing
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/parts/categories
// @desc    Get all part categories
// @access  Public
router.get('/categories', async (req, res, next) => {
  try {
    const cacheKey = 'parts:categories';
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const categories = await Part.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['category'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    const categoryData = categories.map(cat => ({
      name: cat.category,
      count: parseInt(cat.dataValues.count)
    }));

    // Cache for 24 hours
    await cache.set(cacheKey, categoryData, 86400);

    res.json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/parts/:id
// @desc    Get part details
// @access  Public
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const part = await Part.findByPk(req.params.id, {
      include: [
        {
          model: MarketplaceIntegration,
          as: 'marketplaceIntegrations',
          where: { isTracked: true },
          required: false
        },
        {
          model: Review,
          as: 'reviews',
          limit: 10,
          order: [['createdAt', 'DESC']],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'profilePicture']
          }]
        }
      ]
    });

    if (!part) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PART_NOT_FOUND',
          message: 'Part not found'
        }
      });
    }

    // Increment view count
    await part.increment('viewCount');

    // Get compatibility info if vehicle ID provided
    let compatibility = null;
    if (req.query.vehicleId) {
      compatibility = await checkPartCompatibility(part.id, req.query.vehicleId);
    }

    // Calculate review stats
    const reviewStats = await calculateReviewStats(part.id);

    res.json({
      success: true,
      data: {
        part: part.toJSON(),
        compatibility,
        reviewStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/parts/compatible/:vehicleId
// @desc    Get parts compatible with a specific vehicle
// @access  Public
router.get('/compatible/:vehicleId', async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    
    const vehicle = await Vehicle.findByPk(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: 'Vehicle not found'
        }
      });
    }

    // Build compatibility query
    const compatibilityQuery = {
      [Op.or]: [
        // Universal parts
        { isUniversal: true },
        // Make/Model/Year specific
        {
          [Op.and]: [
            { compatibleMakes: { [Op.contains]: [vehicle.make] } },
            { compatibleModels: { [Op.contains]: [vehicle.model] } },
            { compatibleYearStart: { [Op.lte]: vehicle.year } },
            { compatibleYearEnd: { [Op.gte]: vehicle.year } }
          ]
        }
      ]
    };

    if (category) {
      compatibilityQuery.category = category;
    }

    const offset = (page - 1) * limit;

    const parts = await Part.findAndCountAll({
      where: compatibilityQuery,
      limit: parseInt(limit),
      offset,
      order: [['qualityScore', 'DESC']],
      include: [{
        model: MarketplaceIntegration,
        as: 'marketplaceIntegrations',
        where: { isTracked: true },
        required: false,
        attributes: ['platform', 'currentPrice', 'availability']
      }]
    });

    res.json({
      success: true,
      data: parts.rows,
      pagination: {
        total: parts.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parts.count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/parts/:id/social-mention
// @desc    Record social media mention of a part
// @access  Public
router.post('/:id/social-mention', async (req, res, next) => {
  try {
    const { platform, url } = req.body;
    
    const part = await Part.findByPk(req.params.id);
    if (!part) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PART_NOT_FOUND',
          message: 'Part not found'
        }
      });
    }

    // Increment social mentions
    await part.increment('socialMentions');
    
    // Update trending score
    await updateTrendingScore(part);

    logger.info(`Social mention recorded for part ${part.id} from ${platform}`);

    res.json({
      success: true,
      message: 'Social mention recorded'
    });
  } catch (error) {
    next(error);
  }
});

// Helper function for SQL-based search
async function searchPartsSQL(params) {
  const {
    q,
    category,
    subcategory,
    manufacturer,
    minPrice,
    maxPrice,
    minRating,
    compatibleWith,
    page = 1,
    limit = 20,
    sort = 'relevance'
  } = params;

  const where = { isActive: true };
  
  // Text search
  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
      { partNumber: { [Op.iLike]: `%${q}%` } }
    ];
  }

  // Filters
  if (category) where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (manufacturer) where.manufacturer = manufacturer;
  if (minRating) where.averageRating = { [Op.gte]: parseFloat(minRating) };

  // Price filter (requires join with marketplace integrations)
  const include = [{
    model: MarketplaceIntegration,
    as: 'marketplaceIntegrations',
    where: { isTracked: true },
    required: false,
    attributes: ['platform', 'currentPrice', 'availability']
  }];

  // Sorting
  let order;
  switch (sort) {
    case 'price_low':
      order = [[sequelize.col('marketplaceIntegrations.current_price'), 'ASC']];
      break;
    case 'price_high':
      order = [[sequelize.col('marketplaceIntegrations.current_price'), 'DESC']];
      break;
    case 'rating':
      order = [['averageRating', 'DESC']];
      break;
    case 'popularity':
      order = [['viewCount', 'DESC']];
      break;
    default: // relevance
      order = [['trendingScore', 'DESC'], ['qualityScore', 'DESC']];
  }

  const offset = (page - 1) * limit;

  const parts = await Part.findAndCountAll({
    where,
    include,
    order,
    limit: parseInt(limit),
    offset,
    distinct: true
  });

  // Post-process for price filtering
  let filteredRows = parts.rows;
  if (minPrice || maxPrice) {
    filteredRows = parts.rows.filter(part => {
      const prices = part.marketplaceIntegrations
        .map(mi => mi.currentPrice)
        .filter(p => p > 0);
      
      if (prices.length === 0) return false;
      
      const lowestPrice = Math.min(...prices);
      if (minPrice && lowestPrice < parseFloat(minPrice)) return false;
      if (maxPrice && lowestPrice > parseFloat(maxPrice)) return false;
      
      return true;
    });
  }

  return {
    data: filteredRows,
    pagination: {
      total: filteredRows.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(filteredRows.length / limit)
    }
  };
}

// Helper function for Elasticsearch-based search
async function searchPartsElastic(params) {
  const {
    q,
    category,
    subcategory,
    manufacturer,
    minPrice,
    maxPrice,
    minRating,
    page = 1,
    limit = 20,
    sort = 'relevance'
  } = params;

  const must = [{ term: { isActive: true } }];
  const should = [];
  const filter = [];

  // Text search with boosting
  if (q) {
    should.push(
      { match: { name: { query: q, boost: 3 } } },
      { match: { partNumber: { query: q, boost: 2 } } },
      { match: { description: { query: q } } }
    );
  }

  // Filters
  if (category) filter.push({ term: { category } });
  if (subcategory) filter.push({ term: { subcategory } });
  if (manufacturer) filter.push({ term: { manufacturer } });
  if (minRating) filter.push({ range: { averageRating: { gte: minRating } } });
  if (minPrice || maxPrice) {
    const priceRange = {};
    if (minPrice) priceRange.gte = minPrice;
    if (maxPrice) priceRange.lte = maxPrice;
    filter.push({ range: { lowestPrice: priceRange } });
  }

  // Sorting
  let sortClause;
  switch (sort) {
    case 'price_low':
      sortClause = { lowestPrice: 'asc' };
      break;
    case 'price_high':
      sortClause = { lowestPrice: 'desc' };
      break;
    case 'rating':
      sortClause = { averageRating: 'desc' };
      break;
    case 'popularity':
      sortClause = { viewCount: 'desc' };
      break;
    default:
      sortClause = { _score: 'desc' };
  }

  const body = {
    query: {
      bool: {
        must,
        should: should.length > 0 ? should : undefined,
        filter: filter.length > 0 ? filter : undefined,
        minimum_should_match: should.length > 0 ? 1 : undefined
      }
    },
    sort: [sortClause],
    from: (page - 1) * limit,
    size: limit
  };

  const results = await elasticsearch.search('parts', body);

  return {
    data: results.hits,
    pagination: {
      total: results.total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(results.total / limit)
    }
  };
}

// Helper function to check part compatibility
async function checkPartCompatibility(partId, vehicleId) {
  const [part, vehicle] = await Promise.all([
    Part.findByPk(partId),
    Vehicle.findByPk(vehicleId)
  ]);

  if (!part || !vehicle) return null;

  // Universal parts are always compatible
  if (part.isUniversal) {
    return {
      compatible: true,
      confidence: 1.0,
      notes: 'Universal fitment'
    };
  }

  // Check specific compatibility
  const makeMatch = part.compatibleMakes?.includes(vehicle.make);
  const modelMatch = part.compatibleModels?.includes(vehicle.model);
  const yearMatch = vehicle.year >= part.compatibleYearStart && 
                   vehicle.year <= part.compatibleYearEnd;

  if (makeMatch && modelMatch && yearMatch) {
    return {
      compatible: true,
      confidence: 0.95,
      notes: 'Direct fitment confirmed'
    };
  }

  // Check if only make matches (might fit with modifications)
  if (makeMatch) {
    return {
      compatible: 'maybe',
      confidence: 0.6,
      notes: 'May require modifications for fitment'
    };
  }

  return {
    compatible: false,
    confidence: 0.9,
    notes: 'Not compatible with this vehicle'
  };
}

// Helper function to calculate review statistics
async function calculateReviewStats(partId) {
  const stats = await Review.findOne({
    where: { partId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
      [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN verified_purchase = true THEN 1 END')), 'verifiedCount']
    ],
    raw: true
  });

  const distribution = await Review.findAll({
    where: { partId },
    attributes: [
      'rating',
      [sequelize.fn('COUNT', sequelize.col('rating')), 'count']
    ],
    group: ['rating'],
    raw: true
  });

  return {
    totalReviews: parseInt(stats.totalReviews) || 0,
    averageRating: parseFloat(stats.averageRating) || 0,
    verifiedCount: parseInt(stats.verifiedCount) || 0,
    distribution: distribution.reduce((acc, item) => {
      acc[item.rating] = parseInt(item.count);
      return acc;
    }, {})
  };
}

// Helper function to update trending score
async function updateTrendingScore(part) {
  // Simple trending algorithm based on recent activity
  const daysSinceCreated = (Date.now() - part.createdAt) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.max(0, 1 - (daysSinceCreated / 30)); // Decay over 30 days
  
  const trendingScore = (
    (part.viewCount * 0.1) +
    (part.socialMentions * 5) +
    (part.reviewCount * 2) +
    (part.averageRating * 10)
  ) * recencyFactor;

  await part.update({ trendingScore });
}

module.exports = router;