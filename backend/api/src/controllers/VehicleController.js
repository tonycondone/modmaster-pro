const { validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * VehicleController handles all vehicle-related operations
 */
class VehicleController {
  /**
   * Get all vehicles for the authenticated user
   */
  static async getUserVehicles(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;

      const vehicles = await Vehicle.findByUserId(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order: order.toUpperCase()
      });

      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      logger.error('Get user vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get a specific vehicle by ID
   */
  static async getVehicleById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const vehicle = await Vehicle.findById(id);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Check if vehicle belongs to user
      if (vehicle.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: { vehicle }
      });
    } catch (error) {
      logger.error('Get vehicle by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create a new vehicle
   */
  static async createVehicle(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const vehicleData = {
        ...req.body,
        userId
      };

      // Check if VIN already exists for this user
      if (vehicleData.vin) {
        const existingVehicle = await Vehicle.findByVin(vehicleData.vin, userId);
        if (existingVehicle) {
          return res.status(409).json({
            success: false,
            message: 'Vehicle with this VIN already exists'
          });
        }
      }

      const vehicle = await Vehicle.create(vehicleData);

      logger.info(`Vehicle created for user ${userId}: ${vehicle.make} ${vehicle.model}`);

      res.status(201).json({
        success: true,
        message: 'Vehicle created successfully',
        data: { vehicle }
      });
    } catch (error) {
      logger.error('Create vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update a vehicle
   */
  static async updateVehicle(req, res) {
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

      // Check if vehicle exists and belongs to user
      const existingVehicle = await Vehicle.findById(id);
      if (!existingVehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (existingVehicle.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if VIN is being updated and already exists
      if (req.body.vin && req.body.vin !== existingVehicle.vin) {
        const vinExists = await Vehicle.findByVin(req.body.vin, userId);
        if (vinExists && vinExists.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Vehicle with this VIN already exists'
          });
        }
      }

      const updatedVehicle = await Vehicle.update(id, req.body);

      logger.info(`Vehicle updated: ${id}`);

      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: { vehicle: updatedVehicle }
      });
    } catch (error) {
      logger.error('Update vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete a vehicle
   */
  static async deleteVehicle(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if vehicle exists and belongs to user
      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (vehicle.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await Vehicle.delete(id);

      logger.info(`Vehicle deleted: ${id}`);

      res.json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
    } catch (error) {
      logger.error('Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Search vehicles with filters
   */
  static async searchVehicles(req, res) {
    try {
      const userId = req.user.id;
      const {
        search,
        make,
        model,
        year,
        fuelType,
        transmission,
        isActive,
        page = 1,
        limit = 10
      } = req.query;

      const filters = {
        userId,
        search,
        make,
        model,
        year: year ? parseInt(year) : undefined,
        fuelType,
        transmission,
        isActive: isActive ? isActive === 'true' : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const vehicles = await Vehicle.search(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      logger.error('Search vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get vehicle statistics for user
   */
  static async getVehicleStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await Vehicle.getUserStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get vehicle stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add maintenance record to vehicle
   */
  static async addMaintenanceRecord(req, res) {
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

      // Check if vehicle exists and belongs to user
      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (vehicle.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const maintenanceData = {
        ...req.body,
        vehicleId: id
      };

      const maintenance = await Vehicle.addMaintenanceRecord(maintenanceData);

      logger.info(`Maintenance record added to vehicle ${id}`);

      res.status(201).json({
        success: true,
        message: 'Maintenance record added successfully',
        data: { maintenance }
      });
    } catch (error) {
      logger.error('Add maintenance record error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get maintenance history for vehicle
   */
  static async getMaintenanceHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      // Check if vehicle exists and belongs to user
      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (vehicle.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const maintenance = await Vehicle.getMaintenanceHistory(id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: maintenance
      });
    } catch (error) {
      logger.error('Get maintenance history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Toggle vehicle active status
   */
  static async toggleActiveStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if vehicle exists and belongs to user
      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (vehicle.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedVehicle = await Vehicle.toggleActiveStatus(id);

      logger.info(`Vehicle active status toggled: ${id}`);

      res.json({
        success: true,
        message: `Vehicle ${updatedVehicle.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { vehicle: updatedVehicle }
      });
    } catch (error) {
      logger.error('Toggle vehicle status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = VehicleController;