const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validations, commonValidations } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: Get user's vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of user's vehicles
 */
router.get('/my-vehicles',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await Vehicle.findByUserId(req.user.id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/public:
 *   get:
 *     summary: Search public vehicles
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *       - in: query
 *         name: year_min
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year_max
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of public vehicles
 */
router.get('/public',
  optionalAuth,
  rateLimiters.search,
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20, make, model, year_min, year_max } = req.query;

    const result = await Vehicle.searchPublic(q, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      make,
      model,
      year_min: year_min ? parseInt(year_min, 10) : undefined,
      year_max: year_max ? parseInt(year_max, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehicle = await Vehicle.findById(id);

    // Check if user can view this vehicle
    if (!vehicle.is_public && (!req.user || vehicle.user_id !== req.user.id)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: 'Vehicle not found',
        },
      });
    }

    // Increment view count if not owner
    if (!req.user || vehicle.user_id !== req.user.id) {
      await Vehicle.incrementViews(id);
    }

    // Get vehicle stats
    const stats = await Vehicle.getStats(id);

    // Get from cache or fetch owner info
    const cacheKey = `user:${vehicle.user_id}:basic`;
    let owner = await cache.get(cacheKey);
    
    if (!owner) {
      const User = require('../models/User');
      const ownerData = await User.findById(vehicle.user_id);
      owner = {
        id: ownerData.id,
        username: ownerData.username,
        avatar_url: ownerData.avatar_url,
      };
      await cache.set(cacheKey, owner, 3600); // Cache for 1 hour
    }

    res.json({
      success: true,
      data: {
        vehicle,
        owner,
        stats,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: Create new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - year
 *             properties:
 *               vin:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               trim:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 */
router.post('/',
  requireAuth,
  validations.createVehicle,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.create(req.user.id, req.body);

    logger.logBusiness('vehicle_created', {
      userId: req.user.id,
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    });

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
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
 *         description: Vehicle updated successfully
 */
router.put('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehicle = await Vehicle.update(id, req.user.id, req.body);

    logger.logBusiness('vehicle_updated', {
      userId: req.user.id,
      vehicleId: id,
      changes: Object.keys(req.body),
    });

    res.json({
      success: true,
      data: vehicle,
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     tags: [Vehicles]
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
 *         description: Vehicle deleted successfully
 */
router.delete('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await Vehicle.delete(id, req.user.id);

    logger.logBusiness('vehicle_deleted', {
      userId: req.user.id,
      vehicleId: id,
    });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/{id}/modifications:
 *   post:
 *     summary: Add modification to vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - part_name
 *               - category
 *             properties:
 *               part_name:
 *                 type: string
 *               part_id:
 *                 type: string
 *               category:
 *                 type: string
 *               cost:
 *                 type: number
 *               installation_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Modification added successfully
 */
router.post('/:id/modifications',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehicle = await Vehicle.addModification(id, req.user.id, req.body);

    // Update total invested if cost provided
    if (req.body.cost) {
      await Vehicle.update(id, req.user.id, {
        total_invested: (vehicle.total_invested || 0) + req.body.cost,
      });
    }

    logger.logBusiness('modification_added', {
      userId: req.user.id,
      vehicleId: id,
      modification: req.body.part_name,
      cost: req.body.cost,
    });

    res.json({
      success: true,
      data: vehicle,
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/{id}/maintenance:
 *   post:
 *     summary: Add maintenance record
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_type
 *               - mileage
 *             properties:
 *               service_type:
 *                 type: string
 *               mileage:
 *                 type: integer
 *               cost:
 *                 type: number
 *               service_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               next_service_mileage:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Maintenance record added successfully
 */
router.post('/:id/maintenance',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehicle = await Vehicle.addMaintenanceRecord(id, req.user.id, req.body);

    // Update vehicle mileage if provided
    if (req.body.mileage && req.body.mileage > vehicle.mileage) {
      await Vehicle.update(id, req.user.id, {
        mileage: req.body.mileage,
      });
    }

    logger.logBusiness('maintenance_recorded', {
      userId: req.user.id,
      vehicleId: id,
      serviceType: req.body.service_type,
      mileage: req.body.mileage,
    });

    res.json({
      success: true,
      data: vehicle,
    });
  })
);

/**
 * @swagger
 * /api/v1/vehicles/{id}/performance:
 *   put:
 *     summary: Update vehicle performance data
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               horsepower:
 *                 type: number
 *               torque:
 *                 type: number
 *               zero_to_sixty:
 *                 type: number
 *               quarter_mile:
 *                 type: number
 *               top_speed:
 *                 type: number
 *               fuel_economy_city:
 *                 type: number
 *               fuel_economy_highway:
 *                 type: number
 *     responses:
 *       200:
 *         description: Performance data updated successfully
 */
router.put('/:id/performance',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehicle = await Vehicle.updatePerformanceData(id, req.user.id, req.body);

    logger.logBusiness('performance_updated', {
      userId: req.user.id,
      vehicleId: id,
      metrics: Object.keys(req.body),
    });

    res.json({
      success: true,
      data: vehicle,
    });
  })
);

module.exports = router;