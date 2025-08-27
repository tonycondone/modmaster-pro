const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Recommendation, Part, Vehicle, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { recommendationValidation } = require('../validations');
const { cache } = require('../services/cacheService');
const recommendationService = require('../services/recommendationService');
const logger = require('../utils/logger');

// @route   GET /api/v1/recommendations
// @desc    Get personalized recommendations
// @access  Private
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      type = 'all', // all, parts, projects, maintenance
      vehicleId,
      category,
      budget,
      page = 1,
      limit = 20
    } = req.query;

    // Try cache first
    const cacheKey = `recommendations:${req.user.id}:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        cached: true
      });
    }

    // Get user's vehicles if no specific vehicle requested
    let targetVehicles = [];
    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        where: { id: vehicleId, userId: req.user.id }
      });
      if (vehicle) targetVehicles = [vehicle];
    } else {
      targetVehicles = await Vehicle.findAll({
        where: { userId: req.user.id },
        order: [['isPrimary', 'DESC']]
      });
    }

    if (targetVehicles.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Add a vehicle to get personalized recommendations'
      });
    }

    // Generate recommendations based on type
    let recommendations = [];
    
    switch (type) {
      case 'parts':
        recommendations = await getPartRecommendations(req.user, targetVehicles, { category, budget });
        break;
      case 'projects':
        recommendations = await getProjectRecommendations(req.user, targetVehicles, { budget });
        break;
      case 'maintenance':
        recommendations = await getMaintenanceRecommendations(req.user, targetVehicles);
        break;
      default: // 'all'
        const [parts, projects, maintenance] = await Promise.all([
          getPartRecommendations(req.user, targetVehicles, { category, budget, limit: 10 }),
          getProjectRecommendations(req.user, targetVehicles, { budget, limit: 5 }),
          getMaintenanceRecommendations(req.user, targetVehicles, { limit: 5 })
        ]);
        
        recommendations = [
          ...parts.map(r => ({ ...r, type: 'part' })),
          ...projects.map(r => ({ ...r, type: 'project' })),
          ...maintenance.map(r => ({ ...r, type: 'maintenance' }))
        ];
    }

    // Paginate results
    const offset = (page - 1) * limit;
    const paginatedRecommendations = recommendations.slice(offset, offset + limit);

    // Store recommendations in database for tracking
    await storeRecommendations(req.user.id, paginatedRecommendations);

    const result = {
      data: paginatedRecommendations,
      pagination: {
        total: recommendations.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(recommendations.length / limit)
      }
    };

    // Cache for 1 hour
    await cache.set(cacheKey, result, 3600);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/recommendations/ai-powered
// @desc    Get AI-powered recommendations based on scan history
// @access  Private
router.get('/ai-powered', authenticate, async (req, res, next) => {
  try {
    const { vehicleId } = req.query;

    // Get user's scan history
    const recentScans = await Scan.findAll({
      where: {
        userId: req.user.id,
        status: 'completed',
        ...(vehicleId && { vehicleId })
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    if (recentScans.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Complete some scans to get AI-powered recommendations'
      });
    }

    // Call AI recommendation service
    const aiRecommendations = await recommendationService.generateAIRecommendations({
      userId: req.user.id,
      scans: recentScans,
      userPreferences: req.user.preferences
    });

    res.json({
      success: true,
      data: aiRecommendations,
      metadata: {
        basedOnScans: recentScans.length,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/recommendations/trending
// @desc    Get trending modifications for similar vehicles
// @access  Public
router.get('/trending', async (req, res, next) => {
  try {
    const { make, model, year, category, limit = 10 } = req.query;

    const cacheKey = `recommendations:trending:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Find popular modifications for similar vehicles
    const whereClause = {};
    if (make) whereClause.make = make;
    if (model) whereClause.model = model;
    if (year) {
      whereClause.year = {
        [Op.between]: [parseInt(year) - 2, parseInt(year) + 2]
      };
    }

    const popularMods = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.manufacturer,
        COUNT(DISTINCT v.id) as install_count,
        AVG(r.rating) as avg_rating,
        AVG(CAST(v.modifications->jsonb_array_elements->>'performanceGain' AS FLOAT)) as avg_performance_gain
      FROM vehicles v
      CROSS JOIN LATERAL jsonb_array_elements(v.modifications) as mod
      JOIN parts p ON p.id = CAST(mod->>'partId' AS UUID)
      LEFT JOIN reviews r ON r.part_id = p.id
      WHERE v.make = :make
        ${model ? 'AND v.model = :model' : ''}
        ${year ? 'AND v.year BETWEEN :yearMin AND :yearMax' : ''}
        ${category ? 'AND p.category = :category' : ''}
      GROUP BY p.id, p.name, p.category, p.manufacturer
      ORDER BY install_count DESC, avg_rating DESC
      LIMIT :limit
    `, {
      replacements: {
        make,
        model,
        yearMin: year ? parseInt(year) - 2 : null,
        yearMax: year ? parseInt(year) + 2 : null,
        category,
        limit: parseInt(limit)
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Cache for 6 hours
    await cache.set(cacheKey, popularMods, 21600);

    res.json({
      success: true,
      data: popularMods
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/recommendations/:id/feedback
// @desc    Submit feedback on a recommendation
// @access  Private
router.post('/:id/feedback',
  authenticate,
  validateRequest(recommendationValidation.feedback),
  async (req, res, next) => {
    try {
      const { helpful, reason, purchased } = req.body;

      const recommendation = await Recommendation.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RECOMMENDATION_NOT_FOUND',
            message: 'Recommendation not found'
          }
        });
      }

      // Update recommendation with feedback
      await recommendation.update({
        feedback: {
          helpful,
          reason,
          purchased,
          submittedAt: new Date()
        },
        interactedAt: new Date()
      });

      // Update ML model with feedback
      await recommendationService.processFeedback({
        recommendationId: recommendation.id,
        userId: req.user.id,
        partId: recommendation.partId,
        helpful,
        purchased
      });

      logger.info(`Recommendation feedback submitted: ${recommendation.id}`);

      res.json({
        success: true,
        message: 'Thank you for your feedback!'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/recommendations/:id/dismiss
// @desc    Dismiss a recommendation
// @access  Private
router.post('/:id/dismiss', authenticate, async (req, res, next) => {
  try {
    const recommendation = await Recommendation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECOMMENDATION_NOT_FOUND',
          message: 'Recommendation not found'
        }
      });
    }

    await recommendation.update({
      dismissed: true,
      dismissedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Recommendation dismissed'
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions

async function getPartRecommendations(user, vehicles, options = {}) {
  const { category, budget, limit = 20 } = options;

  // Get user's modification history
  const userMods = vehicles.reduce((acc, vehicle) => {
    return [...acc, ...(vehicle.modifications || [])];
  }, []);

  const installedPartIds = userMods.map(mod => mod.partId).filter(Boolean);

  // Build recommendation query
  const whereClause = {
    id: { [Op.notIn]: installedPartIds }, // Exclude already installed parts
    isActive: true
  };

  if (category) whereClause.category = category;
  if (budget) whereClause.price = { [Op.lte]: parseFloat(budget) };

  // Get parts based on compatibility and user preferences
  const recommendedParts = await Part.findAll({
    where: whereClause,
    include: [{
      model: MarketplaceIntegration,
      as: 'marketplaceIntegrations',
      where: { isTracked: true },
      required: false
    }],
    order: [
      ['qualityScore', 'DESC'],
      ['popularityScore', 'DESC']
    ],
    limit
  });

  // Score and rank recommendations
  const scoredRecommendations = recommendedParts.map(part => {
    const score = calculateRecommendationScore(part, user, vehicles);
    
    return {
      id: `part-${part.id}-${Date.now()}`,
      partId: part.id,
      part: part.toJSON(),
      score,
      reason: generateRecommendationReason(part, user, vehicles),
      confidence: score / 100,
      metadata: {
        compatibility: checkCompatibilityWithVehicles(part, vehicles),
        priceRange: getPriceRange(part.marketplaceIntegrations),
        similarUsers: part.popularityScore
      }
    };
  });

  return scoredRecommendations.sort((a, b) => b.score - a.score);
}

async function getProjectRecommendations(user, vehicles, options = {}) {
  const { budget, limit = 10 } = options;

  // Define project templates based on vehicle characteristics
  const projectTemplates = [
    {
      name: 'Performance Package',
      description: 'Boost your vehicle\'s performance with intake, exhaust, and tuning',
      category: 'performance',
      estimatedCost: 1500,
      difficulty: 'intermediate',
      parts: ['cold_air_intake', 'cat_back_exhaust', 'performance_tune']
    },
    {
      name: 'Suspension Upgrade',
      description: 'Improve handling and stance with coilovers and sway bars',
      category: 'handling',
      estimatedCost: 2000,
      difficulty: 'intermediate',
      parts: ['coilovers', 'sway_bars', 'control_arms']
    },
    {
      name: 'Aesthetic Enhancement',
      description: 'Transform your vehicle\'s appearance with wheels, tint, and wrap',
      category: 'appearance',
      estimatedCost: 3000,
      difficulty: 'beginner',
      parts: ['wheels', 'window_tint', 'vinyl_wrap']
    }
  ];

  // Filter projects based on budget and user level
  const filteredProjects = projectTemplates.filter(project => {
    if (budget && project.estimatedCost > parseFloat(budget)) return false;
    if (user.experienceLevel === 'beginner' && project.difficulty === 'advanced') return false;
    return true;
  });

  // Score projects based on user preferences and vehicle type
  const recommendations = filteredProjects.map(project => ({
    id: `project-${project.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    project,
    score: calculateProjectScore(project, user, vehicles),
    reason: `Popular ${project.category} upgrade for ${vehicles[0].make} ${vehicles[0].model} owners`,
    estimatedTime: estimateProjectTime(project),
    requiredTools: getRequiredTools(project)
  }));

  return recommendations.slice(0, limit);
}

async function getMaintenanceRecommendations(user, vehicles, options = {}) {
  const { limit = 10 } = options;
  const recommendations = [];

  for (const vehicle of vehicles) {
    // Calculate maintenance items based on mileage
    const maintenanceItems = calculateMaintenanceSchedule(vehicle);
    
    maintenanceItems.forEach(item => {
      recommendations.push({
        id: `maintenance-${vehicle.id}-${item.type}-${Date.now()}`,
        vehicleId: vehicle.id,
        vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        maintenance: item,
        priority: item.priority,
        reason: item.reason,
        estimatedCost: item.cost,
        dueDate: item.dueDate
      });
    });
  }

  // Sort by priority and due date
  return recommendations
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.dueDate - b.dueDate;
    })
    .slice(0, limit);
}

function calculateRecommendationScore(part, user, vehicles) {
  let score = 50; // Base score

  // Compatibility score
  vehicles.forEach(vehicle => {
    if (part.isUniversal) {
      score += 10;
    } else if (
      part.compatibleMakes?.includes(vehicle.make) &&
      part.compatibleModels?.includes(vehicle.model)
    ) {
      score += 20;
    }
  });

  // Quality score
  score += (part.qualityScore || 0) * 10;

  // Popularity among similar users
  score += (part.popularityScore || 0) * 5;

  // User preference alignment
  if (user.preferences?.preferredCategories?.includes(part.category)) {
    score += 15;
  }

  // Price consideration
  if (user.preferences?.budgetRange) {
    const [min, max] = user.preferences.budgetRange;
    if (part.price >= min && part.price <= max) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

function generateRecommendationReason(part, user, vehicles) {
  const reasons = [];

  if (part.trendingScore > 80) {
    reasons.push('Trending among enthusiasts');
  }

  if (part.qualityScore > 4.5) {
    reasons.push('Highly rated by the community');
  }

  const compatibleVehicles = vehicles.filter(v => 
    part.compatibleMakes?.includes(v.make) && 
    part.compatibleModels?.includes(v.model)
  );

  if (compatibleVehicles.length > 0) {
    reasons.push(`Perfect fit for your ${compatibleVehicles[0].make} ${compatibleVehicles[0].model}`);
  }

  if (reasons.length === 0) {
    reasons.push('Recommended based on your preferences');
  }

  return reasons.join('. ');
}

function calculateMaintenanceSchedule(vehicle) {
  const items = [];
  const mileage = vehicle.mileage || 0;

  // Oil change
  if (mileage % 5000 > 4500 || !vehicle.lastOilChange) {
    items.push({
      type: 'oil_change',
      name: 'Oil Change',
      priority: 3,
      reason: 'Regular oil changes extend engine life',
      cost: 50,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
    });
  }

  // Air filter
  if (mileage % 15000 > 14000) {
    items.push({
      type: 'air_filter',
      name: 'Air Filter Replacement',
      priority: 2,
      reason: 'Clean air filter improves performance and fuel economy',
      cost: 30,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 month
    });
  }

  // Brake pads
  if (mileage % 50000 > 45000) {
    items.push({
      type: 'brake_pads',
      name: 'Brake Pad Inspection',
      priority: 3,
      reason: 'Ensure safe braking performance',
      cost: 150,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
    });
  }

  return items;
}

async function storeRecommendations(userId, recommendations) {
  // Store recommendations for tracking and analytics
  const recommendationRecords = recommendations.map(rec => ({
    userId,
    type: rec.type || 'part',
    partId: rec.partId || null,
    vehicleId: rec.vehicleId || null,
    score: rec.score || 0,
    reason: rec.reason,
    metadata: rec.metadata || {}
  }));

  try {
    await Recommendation.bulkCreate(recommendationRecords, {
      ignoreDuplicates: true
    });
  } catch (error) {
    logger.error('Error storing recommendations:', error);
  }
}

module.exports = router;