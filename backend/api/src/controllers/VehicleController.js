const { validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const VehicleScan = require('../models/VehicleScan');
const Part = require('../models/Part');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { getVehicleInfo } = require('../services/vehicleDataService');
const redis = require('../utils/redis');
const { Op } = require('sequelize');

class VehicleController {
  /**
   * Get all vehicles for authenticated user
   * @route GET /api/vehicles
   */
  static async getUserVehicles(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = req.query;

      // Check cache
      const cacheKey = `vehicles:${userId}:${page}:${limit}:${sort}:${order}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const offset = (page - 1) * limit;

      const vehicles = await Vehicle.findAndCountAll({
        where: { user_id: userId, deleted_at: null },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sort, order]],
        include: [
          {
            model: VehicleScan,
            as: 'scans',
            limit: 5,
            order: [['created_at', 'DESC']]
          }
        ]
      });

      const result = {
        success: true,
        data: {
          vehicles: vehicles.rows,
          pagination: {
            total: vehicles.count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(vehicles.count / limit)
          }
        }
      };

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(result));

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single vehicle
   * @route GET /api/vehicles/:id
   */
  static async getVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null },
        include: [
          {
            model: VehicleScan,
            as: 'scans',
            include: [
              {
                model: Part,
                as: 'detectedParts'
              }
            ]
          }
        ]
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      res.json({
        success: true,
        data: { vehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new vehicle
   * @route POST /api/vehicles
   */
  static async createVehicle(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const userId = req.user.id;
      const {
        make,
        model,
        year,
        vin,
        license_plate,
        color,
        mileage,
        engine_type,
        transmission_type,
        fuel_type,
        nickname,
        notes
      } = req.body;

      // Check if VIN already exists for user
      if (vin) {
        const existingVehicle = await Vehicle.findOne({
          where: { vin, user_id: userId, deleted_at: null }
        });
        if (existingVehicle) {
          throw new ValidationError('Vehicle with this VIN already exists');
        }

        // Get additional vehicle info from VIN
        try {
          const vinData = await getVehicleInfo(vin);
          if (vinData) {
            // Merge VIN data with user input (user input takes precedence)
            Object.assign(req.body, {
              make: make || vinData.make,
              model: model || vinData.model,
              year: year || vinData.year,
              engine_type: engine_type || vinData.engine_type,
              transmission_type: transmission_type || vinData.transmission_type,
              fuel_type: fuel_type || vinData.fuel_type
            });
          }
        } catch (vinError) {
          logger.warn('Failed to fetch VIN data', { error: vinError.message, vin });
        }
      }

      // Handle image upload if provided
      let imageUrl = null;
      if (req.files && req.files.image) {
        const uploadResult = await uploadToCloudinary(req.files.image, 'vehicles');
        imageUrl = uploadResult.secure_url;
      }

      // Create vehicle
      const vehicle = await Vehicle.create({
        user_id: userId,
        make: req.body.make,
        model: req.body.model,
        year: req.body.year,
        vin,
        license_plate,
        color,
        mileage,
        engine_type: req.body.engine_type,
        transmission_type: req.body.transmission_type,
        fuel_type: req.body.fuel_type,
        nickname,
        notes,
        image_url: imageUrl,
        is_primary: false // Will be set in the next step if needed
      });

      // If this is the user's first vehicle, make it primary
      const vehicleCount = await Vehicle.count({
        where: { user_id: userId, deleted_at: null }
      });

      if (vehicleCount === 1) {
        await vehicle.update({ is_primary: true });
      }

      // Clear user's vehicle cache
      const keys = await redis.keys(`vehicles:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info('Vehicle created', { userId, vehicleId: vehicle.id });

      res.status(201).json({
        success: true,
        message: 'Vehicle created successfully',
        data: { vehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vehicle
   * @route PUT /api/vehicles/:id
   */
  static async updateVehicle(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { id } = req.params;
      const userId = req.user.id;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      // Handle image upload if provided
      if (req.files && req.files.image) {
        // Delete old image if exists
        if (vehicle.image_url) {
          await deleteFromCloudinary(vehicle.image_url);
        }

        const uploadResult = await uploadToCloudinary(req.files.image, 'vehicles');
        req.body.image_url = uploadResult.secure_url;
      }

      // Update vehicle
      await vehicle.update(req.body);

      // Clear cache
      const keys = await redis.keys(`vehicles:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info('Vehicle updated', { userId, vehicleId: id });

      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: { vehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete vehicle
   * @route DELETE /api/vehicles/:id
   */
  static async deleteVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      // Soft delete
      await vehicle.update({ deleted_at: new Date() });

      // If this was the primary vehicle, set another as primary
      if (vehicle.is_primary) {
        const nextVehicle = await Vehicle.findOne({
          where: { 
            user_id: userId, 
            deleted_at: null,
            id: { [Op.ne]: id }
          },
          order: [['created_at', 'ASC']]
        });

        if (nextVehicle) {
          await nextVehicle.update({ is_primary: true });
        }
      }

      // Clear cache
      const keys = await redis.keys(`vehicles:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info('Vehicle deleted', { userId, vehicleId: id });

      res.json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set primary vehicle
   * @route POST /api/vehicles/:id/primary
   */
  static async setPrimaryVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      // Remove primary status from all user's vehicles
      await Vehicle.update(
        { is_primary: false },
        { where: { user_id: userId } }
      );

      // Set this vehicle as primary
      await vehicle.update({ is_primary: true });

      // Clear cache
      const keys = await redis.keys(`vehicles:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info('Primary vehicle set', { userId, vehicleId: id });

      res.json({
        success: true,
        message: 'Primary vehicle updated successfully',
        data: { vehicle }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle maintenance history
   * @route GET /api/vehicles/:id/maintenance
   */
  static async getMaintenanceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      const offset = (page - 1) * limit;

      // Get maintenance records (assuming a maintenance_records table exists)
      const maintenanceRecords = await vehicle.getMaintenanceRecords({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          maintenance: maintenanceRecords,
          vehicle: {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add maintenance record
   * @route POST /api/vehicles/:id/maintenance
   */
  static async addMaintenanceRecord(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        type,
        description,
        date,
        mileage,
        cost,
        service_provider,
        notes
      } = req.body;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      // Create maintenance record
      const maintenanceRecord = await vehicle.createMaintenanceRecord({
        type,
        description,
        date,
        mileage,
        cost,
        service_provider,
        notes
      });

      // Update vehicle mileage if provided and greater than current
      if (mileage && mileage > vehicle.mileage) {
        await vehicle.update({ mileage });
      }

      logger.info('Maintenance record added', { userId, vehicleId: id, recordId: maintenanceRecord.id });

      res.status(201).json({
        success: true,
        message: 'Maintenance record added successfully',
        data: { maintenanceRecord }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle scan history
   * @route GET /api/vehicles/:id/scans
   */
  static async getVehicleScans(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 20, status } = req.query;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null }
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      const offset = (page - 1) * limit;
      const whereClause = { vehicle_id: id };
      
      if (status) {
        whereClause.status = status;
      }

      const scans = await VehicleScan.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Part,
            as: 'detectedParts',
            through: {
              attributes: ['confidence_score', 'location']
            }
          }
        ]
      });

      res.json({
        success: true,
        data: {
          scans: scans.rows,
          pagination: {
            total: scans.count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(scans.count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate vehicle report
   * @route GET /api/vehicles/:id/report
   */
  static async generateVehicleReport(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const vehicle = await Vehicle.findOne({
        where: { id, user_id: userId, deleted_at: null },
        include: [
          {
            model: VehicleScan,
            as: 'scans',
            include: [
              {
                model: Part,
                as: 'detectedParts'
              }
            ]
          }
        ]
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      // Generate comprehensive report
      const report = {
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin,
          mileage: vehicle.mileage,
          created_at: vehicle.created_at
        },
        statistics: {
          total_scans: vehicle.scans.length,
          total_parts_detected: vehicle.scans.reduce((sum, scan) => sum + scan.detectedParts.length, 0),
          last_scan_date: vehicle.scans[0]?.created_at || null,
          most_scanned_parts: await vehicle.getMostScannedParts(),
          maintenance_summary: await vehicle.getMaintenanceSummary()
        },
        scan_history: vehicle.scans.slice(0, 10), // Last 10 scans
        recommendations: await vehicle.getRecommendations()
      };

      res.json({
        success: true,
        data: { report }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VehicleController;