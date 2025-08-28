const { validationResult } = require('express-validator');
const Part = require('../models/Part');
const Vehicle = require('../models/Vehicle');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { uploadToCloudinary } = require('../services/uploadService');
const { searchParts, getPartPricing } = require('../services/partSearchService');
const { getCompatibleParts } = require('../services/compatibilityService');
const redis = require('../utils/redis');
const { Op } = require('sequelize');
const sequelize = require('../utils/database');

class PartController {
  /**
   * Search parts catalog
   * @route GET /api/parts/search
   */
  static async searchParts(req, res, next) {
    try {
      const {
        query,
        category,
        make,
        model,
        year,
        min_price,
        max_price,
        condition,
        seller_type,
        location,
        radius,
        sort = 'relevance',
        page = 1,
        limit = 20
      } = req.query;

      // Build search criteria
      const searchCriteria = {
        query,
        filters: {
          category,
          vehicle: { make, model, year },
          price: { min: min_price, max: max_price },
          condition,
          seller_type,
          location: location ? { coordinates: location, radius: radius || 50 } : null
        },
        sort,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };

      // Check cache
      const cacheKey = `parts:search:${JSON.stringify(searchCriteria)}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Search parts using external service integration
      const searchResults = await searchParts(searchCriteria);

      // Enhance results with local data
      const enhancedResults = await Promise.all(
        searchResults.parts.map(async (part) => {
          // Get local part info if exists
          const localPart = await Part.findOne({
            where: {
              [Op.or]: [
                { oem_number: part.oem_number },
                { universal_part_number: part.upn }
              ]
            }
          });

          if (localPart) {
            part.local_data = {
              id: localPart.id,
              average_rating: localPart.average_rating,
              review_count: localPart.review_count,
              scan_count: localPart.scan_count
            };
          }

          return part;
        })
      );

      const result = {
        success: true,
        data: {
          parts: enhancedResults,
          pagination: searchResults.pagination,
          filters: searchResults.applied_filters,
          suggestions: searchResults.suggestions
        }
      };

      // Cache for 10 minutes
      await redis.setex(cacheKey, 600, JSON.stringify(result));

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get part details
   * @route GET /api/parts/:id
   */
  static async getPartDetails(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const part = await Part.findByPk(id, {
        include: [
          {
            model: Vehicle,
            as: 'compatibleVehicles',
            through: { attributes: ['notes'] }
          },
          {
            model: Part,
            as: 'alternativeParts',
            through: { attributes: ['compatibility_score'] }
          }
        ]
      });

      if (!part) {
        throw new AppError('Part not found', 404);
      }

      // Get current pricing from multiple sources
      const pricing = await getPartPricing(part);

      // Get user-specific data if authenticated
      let userSpecific = null;
      if (userId) {
        userSpecific = {
          is_saved: await part.isSavedByUser(userId),
          user_vehicles_compatible: await part.checkUserVehiclesCompatibility(userId),
          purchase_history: await part.getUserPurchaseHistory(userId)
        };
      }

      // Increment view count
      await part.increment('view_count');

      res.json({
        success: true,
        data: {
          part: {
            ...part.toJSON(),
            pricing,
            user_specific: userSpecific
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get compatible parts for a vehicle
   * @route GET /api/parts/compatible/:vehicleId
   */
  static async getCompatibleParts(req, res, next) {
    try {
      const { vehicleId } = req.params;
      const { category, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      // Verify vehicle belongs to user
      const vehicle = await Vehicle.findOne({
        where: { id: vehicleId, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      // Get compatible parts
      const compatibleParts = await getCompatibleParts({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        engine_type: vehicle.engine_type,
        category,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

      res.json({
        success: true,
        data: {
          vehicle: {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year
          },
          parts: compatibleParts.parts,
          pagination: compatibleParts.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create custom part listing
   * @route POST /api/parts
   */
  static async createPart(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const userId = req.user.id;
      const {
        name,
        description,
        category,
        subcategory,
        manufacturer,
        oem_number,
        condition,
        price,
        quantity,
        location,
        shipping_available,
        vehicle_compatibility
      } = req.body;

      // Handle image uploads
      const images = [];
      if (req.files && req.files.images) {
        const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        
        for (const image of imageFiles.slice(0, 5)) { // Max 5 images
          const uploadResult = await uploadToCloudinary(image, 'parts');
          images.push({
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            order: images.length
          });
        }
      }

      // Create part listing
      const part = await Part.create({
        seller_id: userId,
        name,
        description,
        category,
        subcategory,
        manufacturer,
        oem_number,
        condition,
        price,
        quantity,
        location,
        shipping_available,
        images,
        vehicle_compatibility,
        status: 'active',
        listing_type: 'user'
      });

      logger.info('Part listing created', { userId, partId: part.id });

      res.status(201).json({
        success: true,
        message: 'Part listing created successfully',
        data: { part }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update part listing
   * @route PUT /api/parts/:id
   */
  static async updatePart(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const part = await Part.findOne({
        where: { id, seller_id: userId }
      });

      if (!part) {
        throw new AppError('Part not found or unauthorized', 404);
      }

      // Handle new image uploads
      if (req.files && req.files.images) {
        const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        const newImages = [...part.images];

        for (const image of imageFiles) {
          if (newImages.length >= 5) break;
          
          const uploadResult = await uploadToCloudinary(image, 'parts');
          newImages.push({
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            order: newImages.length
          });
        }

        req.body.images = newImages;
      }

      await part.update(req.body);

      logger.info('Part listing updated', { userId, partId: id });

      res.json({
        success: true,
        message: 'Part listing updated successfully',
        data: { part }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete part listing
   * @route DELETE /api/parts/:id
   */
  static async deletePart(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const part = await Part.findOne({
        where: { id, seller_id: userId }
      });

      if (!part) {
        throw new AppError('Part not found or unauthorized', 404);
      }

      // Soft delete
      await part.update({ 
        status: 'deleted',
        deleted_at: new Date()
      });

      logger.info('Part listing deleted', { userId, partId: id });

      res.json({
        success: true,
        message: 'Part listing deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save part to favorites
   * @route POST /api/parts/:id/save
   */
  static async savePart(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const part = await Part.findByPk(id);
      if (!part) {
        throw new AppError('Part not found', 404);
      }

      await part.addSavedByUser(userId);

      res.json({
        success: true,
        message: 'Part saved to favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove part from favorites
   * @route DELETE /api/parts/:id/save
   */
  static async unsavePart(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const part = await Part.findByPk(id);
      if (!part) {
        throw new AppError('Part not found', 404);
      }

      await part.removeSavedByUser(userId);

      res.json({
        success: true,
        message: 'Part removed from favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get saved parts
   * @route GET /api/parts/saved
   */
  static async getSavedParts(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;

      const savedParts = await Part.findAndCountAll({
        include: [{
          model: User,
          as: 'savedByUsers',
          where: { id: userId },
          attributes: []
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      res.json({
        success: true,
        data: {
          parts: savedParts.rows,
          pagination: {
            total: savedParts.count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(savedParts.count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get price history for a part
   * @route GET /api/parts/:id/price-history
   */
  static async getPriceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;

      const part = await Part.findByPk(id);
      if (!part) {
        throw new AppError('Part not found', 404);
      }

      const priceHistory = await part.getPriceHistory(days);

      res.json({
        success: true,
        data: {
          part: {
            id: part.id,
            name: part.name,
            current_price: part.price
          },
          price_history: priceHistory
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get part reviews
   * @route GET /api/parts/:id/reviews
   */
  static async getPartReviews(req, res, next) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, sort = 'helpful' } = req.query;

      const part = await Part.findByPk(id);
      if (!part) {
        throw new AppError('Part not found', 404);
      }

      const offset = (page - 1) * limit;
      
      const reviews = await part.getReviews({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: sort === 'helpful' ? [['helpful_count', 'DESC']] : [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'avatar_url']
        }]
      });

      res.json({
        success: true,
        data: {
          reviews,
          summary: {
            average_rating: part.average_rating,
            total_reviews: part.review_count,
            rating_distribution: await part.getRatingDistribution()
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add part review
   * @route POST /api/parts/:id/reviews
   */
  static async addPartReview(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { rating, title, comment, verified_purchase } = req.body;

      const part = await Part.findByPk(id);
      if (!part) {
        throw new AppError('Part not found', 404);
      }

      // Check if user already reviewed this part
      const existingReview = await part.getUserReview(userId);
      if (existingReview) {
        throw new ValidationError('You have already reviewed this part');
      }

      // Create review
      const review = await part.createReview({
        user_id: userId,
        rating,
        title,
        comment,
        verified_purchase: verified_purchase || false
      });

      // Update part rating
      await part.updateRating();

      logger.info('Part review added', { userId, partId: id, reviewId: review.id });

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: { review }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get part alternatives
   * @route GET /api/parts/:id/alternatives
   */
  static async getPartAlternatives(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      const part = await Part.findByPk(id);
      if (!part) {
        throw new AppError('Part not found', 404);
      }

      const alternatives = await part.getAlternatives({
        limit: parseInt(limit),
        order: [['compatibility_score', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          original_part: {
            id: part.id,
            name: part.name,
            oem_number: part.oem_number
          },
          alternatives
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PartController;