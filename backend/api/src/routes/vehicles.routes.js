const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Vehicle, User, Scan, Project } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { vehicleValidation } = require('../validations');
const logger = require('../utils/logger');
const { uploadImage } = require('../services/uploadService');

// @route   GET /api/v1/vehicles/my-vehicles
// @desc    Get user's vehicles
// @access  Private
router.get('/my-vehicles', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt:desc' } = req.query;
    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    const vehicles = await Vehicle.findAndCountAll({
      where: { userId: req.user.id },
      limit: parseInt(limit),
      offset,
      order: [[sortField, sortOrder.toUpperCase()]],
      include: [
        {
          model: Scan,
          as: 'scans',
          attributes: ['id'],
          required: false
        },
        {
          model: Project,
          as: 'projects',
          attributes: ['id'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: vehicles.rows,
      pagination: {
        total: vehicles.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(vehicles.count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/vehicles
// @desc    Create new vehicle
// @access  Private
router.post('/', 
  authenticate,
  validateRequest(vehicleValidation.create),
  async (req, res, next) => {
    try {
      const vehicleData = {
        ...req.body,
        userId: req.user.id
      };

      // Check if VIN already exists
      if (vehicleData.vin) {
        const existingVehicle = await Vehicle.findOne({
          where: { vin: vehicleData.vin }
        });
        
        if (existingVehicle) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VIN_EXISTS',
              message: 'A vehicle with this VIN already exists'
            }
          });
        }
      }

      // If setting as primary, unset other vehicles
      if (vehicleData.isPrimary) {
        await Vehicle.update(
          { isPrimary: false },
          { where: { userId: req.user.id } }
        );
      }

      const vehicle = await Vehicle.create(vehicleData);

      // Update user stats
      await req.user.updateStats('totalVehicles', 1);

      logger.info(`Vehicle created: ${vehicle.id} by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/v1/vehicles/:id
// @desc    Get vehicle details
// @access  Public (if vehicle is public) / Private
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: 'Vehicle not found'
        }
      });
    }

    // Check access permissions
    const isOwner = req.user && req.user.id === vehicle.userId;
    if (!vehicle.isPublic && !isOwner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: 'Vehicle not found'
        }
      });
    }

    // Increment view count if not owner
    if (!isOwner) {
      await vehicle.incrementViews();
    }

    // Get vehicle stats
    const stats = await getVehicleStats(vehicle.id);

    res.json({
      success: true,
      data: {
        vehicle,
        stats,
        isOwner
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/v1/vehicles/:id
// @desc    Update vehicle
// @access  Private (owner only)
router.put('/:id',
  authenticate,
  validateRequest(vehicleValidation.update),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VEHICLE_NOT_FOUND',
            message: 'Vehicle not found'
          }
        });
      }

      // Check VIN uniqueness if updating
      if (req.body.vin && req.body.vin !== vehicle.vin) {
        const existingVehicle = await Vehicle.findOne({
          where: {
            vin: req.body.vin,
            id: { [Op.ne]: vehicle.id }
          }
        });
        
        if (existingVehicle) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VIN_EXISTS',
              message: 'A vehicle with this VIN already exists'
            }
          });
        }
      }

      // If setting as primary, unset other vehicles
      if (req.body.isPrimary && !vehicle.isPrimary) {
        await Vehicle.update(
          { isPrimary: false },
          { 
            where: { 
              userId: req.user.id,
              id: { [Op.ne]: vehicle.id }
            } 
          }
        );
      }

      await vehicle.update(req.body);

      logger.info(`Vehicle updated: ${vehicle.id} by user ${req.user.id}`);

      res.json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/v1/vehicles/:id
// @desc    Delete vehicle
// @access  Private (owner only)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: 'Vehicle not found'
        }
      });
    }

    await vehicle.destroy();

    // Update user stats
    await req.user.updateStats('totalVehicles', -1);

    logger.info(`Vehicle deleted: ${req.params.id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/vehicles/:id/modifications
// @desc    Add modification to vehicle
// @access  Private (owner only)
router.post('/:id/modifications',
  authenticate,
  validateRequest(vehicleValidation.addModification),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VEHICLE_NOT_FOUND',
            message: 'Vehicle not found'
          }
        });
      }

      await vehicle.addModification(req.body);

      logger.info(`Modification added to vehicle ${vehicle.id}`);

      res.json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/vehicles/:id/maintenance
// @desc    Add maintenance record
// @access  Private (owner only)
router.post('/:id/maintenance',
  authenticate,
  validateRequest(vehicleValidation.addMaintenance),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VEHICLE_NOT_FOUND',
            message: 'Vehicle not found'
          }
        });
      }

      await vehicle.addMaintenanceRecord(req.body);

      logger.info(`Maintenance record added to vehicle ${vehicle.id}`);

      res.json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/v1/vehicles/:id/images
// @desc    Upload vehicle images
// @access  Private (owner only)
router.post('/:id/images',
  authenticate,
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VEHICLE_NOT_FOUND',
            message: 'Vehicle not found'
          }
        });
      }

      // Handle image upload
      const uploadedImages = await uploadImage(req.files, 'vehicles');
      
      // Add to vehicle images
      const currentImages = vehicle.images || [];
      vehicle.images = [...currentImages, ...uploadedImages];
      await vehicle.save();

      res.json({
        success: true,
        data: {
          images: uploadedImages
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/v1/vehicles/search/public
// @desc    Search public vehicles
// @access  Public
router.get('/search/public', async (req, res, next) => {
  try {
    const {
      q,
      make,
      model,
      yearMin,
      yearMax,
      page = 1,
      limit = 20,
      sort = 'createdAt:desc'
    } = req.query;

    const where = { isPublic: true };
    
    // Build search conditions
    if (q) {
      where[Op.or] = [
        { nickname: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { make: { [Op.iLike]: `%${q}%` } },
        { model: { [Op.iLike]: `%${q}%` } }
      ];
    }

    if (make) where.make = { [Op.iLike]: make };
    if (model) where.model = { [Op.iLike]: model };
    if (yearMin) where.year = { [Op.gte]: yearMin };
    if (yearMax) where.year = { ...where.year, [Op.lte]: yearMax };

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    const vehicles = await Vehicle.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortField, sortOrder.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json({
      success: true,
      data: vehicles.rows,
      pagination: {
        total: vehicles.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(vehicles.count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to get vehicle stats
async function getVehicleStats(vehicleId) {
  const [scanCount, projectCount, modCount] = await Promise.all([
    Scan.count({ where: { vehicleId } }),
    Project.count({ where: { vehicleId } }),
    Vehicle.findByPk(vehicleId, {
      attributes: [[sequelize.fn('jsonb_array_length', sequelize.col('modifications')), 'modCount']]
    })
  ]);

  return {
    totalScans: scanCount,
    totalProjects: projectCount,
    totalModifications: modCount?.dataValues?.modCount || 0
  };
}

module.exports = router;