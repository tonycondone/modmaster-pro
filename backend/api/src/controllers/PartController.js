const { validationResult } = require('express-validator');
const Part = require('../models/Part');
const logger = require('../utils/logger');

/**
 * PartController handles all parts marketplace operations
 */
class PartController {
  /**
   * Get all parts with filtering and pagination
   */
  static async getAllParts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        brand,
        condition,
        minPrice,
        maxPrice,
        compatibility,
        sort = 'createdAt',
        order = 'DESC'
      } = req.query;

      const filters = {
        search,
        category,
        brand,
        condition,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        compatibility
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const parts = await Part.findAll(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order: order.toUpperCase()
      });

      res.json({
        success: true,
        data: parts
      });
    } catch (error) {
      logger.error('Get all parts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get a specific part by ID
   */
  static async getPartById(req, res) {
    try {
      const { id } = req.params;

      const part = await Part.findById(id);
      
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      // Increment view count
      await Part.incrementViewCount(id);

      res.json({
        success: true,
        data: { part }
      });
    } catch (error) {
      logger.error('Get part by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Search parts with advanced filters
   */
  static async searchParts(req, res) {
    try {
      const { q: query } = req.query;
      const {
        page = 1,
        limit = 20,
        category,
        brand,
        condition,
        minPrice,
        maxPrice,
        compatibility
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const filters = {
        query,
        category,
        brand,
        condition,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        compatibility
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const results = await Part.search(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Search parts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get parts by category
   */
  static async getPartsByCategory(req, res) {
    try {
      const { category } = req.params;
      const {
        page = 1,
        limit = 20,
        brand,
        condition,
        minPrice,
        maxPrice,
        sort = 'createdAt',
        order = 'DESC'
      } = req.query;

      const filters = {
        category,
        brand,
        condition,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const parts = await Part.findByCategory(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order: order.toUpperCase()
      });

      res.json({
        success: true,
        data: parts
      });
    } catch (error) {
      logger.error('Get parts by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get compatible parts for a vehicle
   */
  static async getCompatibleParts(req, res) {
    try {
      const { vehicleId } = req.params;
      const { page = 1, limit = 20, category } = req.query;

      const parts = await Part.findCompatibleParts(vehicleId, {
        category,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: parts
      });
    } catch (error) {
      logger.error('Get compatible parts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all part categories
   */
  static async getCategories(req, res) {
    try {
      const categories = await Part.getCategories();

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all brands
   */
  static async getBrands(req, res) {
    try {
      const { category } = req.query;
      const brands = await Part.getBrands(category);

      res.json({
        success: true,
        data: { brands }
      });
    } catch (error) {
      logger.error('Get brands error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get featured/trending parts
   */
  static async getFeaturedParts(req, res) {
    try {
      const { limit = 10, type = 'featured' } = req.query;

      let parts;
      if (type === 'trending') {
        parts = await Part.getTrendingParts(parseInt(limit));
      } else if (type === 'popular') {
        parts = await Part.getPopularParts(parseInt(limit));
      } else {
        parts = await Part.getFeaturedParts(parseInt(limit));
      }

      res.json({
        success: true,
        data: { parts }
      });
    } catch (error) {
      logger.error('Get featured parts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get part recommendations based on user's vehicles
   */
  static async getRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const recommendations = await Part.getRecommendations(userId, parseInt(limit));

      res.json({
        success: true,
        data: { recommendations }
      });
    } catch (error) {
      logger.error('Get recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add part to favorites
   */
  static async addToFavorites(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if part exists
      const part = await Part.findById(id);
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      // Check if already in favorites
      const isFavorite = await Part.isInFavorites(userId, id);
      if (isFavorite) {
        return res.status(409).json({
          success: false,
          message: 'Part already in favorites'
        });
      }

      await Part.addToFavorites(userId, id);

      logger.info(`Part ${id} added to favorites by user ${userId}`);

      res.json({
        success: true,
        message: 'Part added to favorites'
      });
    } catch (error) {
      logger.error('Add to favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Remove part from favorites
   */
  static async removeFromFavorites(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await Part.removeFromFavorites(userId, id);

      logger.info(`Part ${id} removed from favorites by user ${userId}`);

      res.json({
        success: true,
        message: 'Part removed from favorites'
      });
    } catch (error) {
      logger.error('Remove from favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's favorite parts
   */
  static async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const favorites = await Part.getFavorites(userId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: favorites
      });
    } catch (error) {
      logger.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add review for a part
   */
  static async addReview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const { rating, comment } = req.body;

      // Check if part exists
      const part = await Part.findById(id);
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      // Check if user already reviewed this part
      const existingReview = await Part.getUserReview(userId, id);
      if (existingReview) {
        return res.status(409).json({
          success: false,
          message: 'You have already reviewed this part'
        });
      }

      const reviewData = {
        partId: id,
        userId,
        rating,
        comment
      };

      const review = await Part.addReview(reviewData);

      logger.info(`Review added for part ${id} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: { review }
      });
    } catch (error) {
      logger.error('Add review error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get reviews for a part
   */
  static async getReviews(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const reviews = await Part.getReviews(id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      logger.error('Get reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = PartController;