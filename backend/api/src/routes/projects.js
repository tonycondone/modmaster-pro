const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimit');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: Get user's projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, in_progress, completed, on_hold, cancelled]
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/my-projects',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { status, vehicle_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('modification_projects as mp')
      .where('mp.user_id', req.user.id);

    if (status) {
      query = query.where('mp.status', status);
    }

    if (vehicle_id) {
      query = query.where('mp.vehicle_id', vehicle_id);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get projects with vehicle info
    const projects = await query
      .select(
        'mp.*',
        'v.make',
        'v.model',
        'v.year',
        'v.nickname as vehicle_nickname'
      )
      .join('vehicles as v', 'mp.vehicle_id', 'v.id')
      .orderBy('mp.updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: projects,
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
 * /api/v1/projects/public:
 *   get:
 *     summary: Browse public projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: difficulty_level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *     responses:
 *       200:
 *         description: List of public projects
 */
router.get('/public',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { featured, difficulty_level, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('modification_projects as mp')
      .where('mp.is_public', true)
      .where('mp.status', 'completed');

    if (featured === 'true') {
      query = query.where('mp.is_featured', true);
    }

    if (difficulty_level) {
      query = query.where('mp.difficulty_level', difficulty_level);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get projects with vehicle and user info
    const projects = await query
      .select(
        'mp.*',
        'v.make',
        'v.model',
        'v.year',
        'u.username',
        'u.avatar_url as user_avatar'
      )
      .join('vehicles as v', 'mp.vehicle_id', 'v.id')
      .join('users as u', 'mp.user_id', 'u.id')
      .orderBy('mp.likes_count', 'desc')
      .orderBy('mp.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: projects,
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
 * /api/v1/projects/{id}:
 *   get:
 *     summary: Get project details
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/:id',
  optionalAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const project = await db('modification_projects')
      .where({ id })
      .first();

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check if user can view this project
    if (!project.is_public && (!req.user || project.user_id !== req.user.id)) {
      throw new NotFoundError('Project not found');
    }

    // Get vehicle info
    const vehicle = await db('vehicles')
      .where({ id: project.vehicle_id })
      .select('id', 'make', 'model', 'year', 'nickname')
      .first();

    // Get user info
    const user = await db('users')
      .where({ id: project.user_id })
      .select('id', 'username', 'avatar_url')
      .first();

    // Get parts details
    let partsDetails = [];
    if (project.parts_list && project.parts_list.length > 0) {
      const partIds = project.parts_list.map(p => p.part_id).filter(id => id);
      
      if (partIds.length > 0) {
        const parts = await db('parts')
          .whereIn('id', partIds)
          .select('id', 'name', 'part_number', 'category', 'manufacturer', 'price_min', 'price_max');

        partsDetails = project.parts_list.map(item => {
          const part = parts.find(p => p.id === item.part_id);
          return { ...item, part_details: part };
        });
      }
    }

    // Increment view count if not owner
    if (!req.user || project.user_id !== req.user.id) {
      await db('modification_projects')
        .where({ id })
        .increment('views_count', 1);
    }

    res.json({
      success: true,
      data: {
        ...project,
        vehicle,
        user,
        parts_list_with_details: partsDetails,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_id
 *               - title
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               difficulty_level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post('/',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const {
      vehicle_id,
      title,
      description,
      budget,
      difficulty_level = 'intermediate',
      estimated_hours,
      estimated_completion,
      is_public = true,
      tags = [],
    } = req.body;

    // Verify vehicle ownership
    const vehicle = await db('vehicles')
      .where({ id: vehicle_id, user_id: req.user.id })
      .first();

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const [project] = await db('modification_projects')
      .insert({
        user_id: req.user.id,
        vehicle_id,
        title,
        description,
        budget,
        difficulty_level,
        estimated_hours,
        estimated_completion,
        is_public,
        tags,
        status: 'planning',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    logger.logBusiness('project_created', {
      userId: req.user.id,
      projectId: project.id,
      vehicleId: vehicle_id,
      title,
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
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
 *         description: Project updated successfully
 */
router.put('/:id',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const project = await db('modification_projects')
      .where({ id, user_id: req.user.id })
      .first();

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Remove fields that shouldn't be updated
    const {
      id: _,
      user_id,
      vehicle_id,
      created_at,
      views_count,
      likes_count,
      comments_count,
      ...updateData
    } = req.body;

    const [updated] = await db('modification_projects')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    logger.logBusiness('project_updated', {
      userId: req.user.id,
      projectId: id,
      changes: Object.keys(updateData),
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}/parts:
 *   post:
 *     summary: Add part to project
 *     tags: [Projects]
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
 *               - part_id
 *               - quantity
 *             properties:
 *               part_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *               estimated_cost:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Part added to project
 */
router.post('/:id/parts',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { part_id, quantity = 1, estimated_cost, notes } = req.body;

    // Check ownership
    const project = await db('modification_projects')
      .where({ id, user_id: req.user.id })
      .first();

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Verify part exists
    const part = await db('parts')
      .where({ id: part_id })
      .first();

    if (!part) {
      throw new NotFoundError('Part not found');
    }

    // Add to parts list
    const parts_list = project.parts_list || [];
    parts_list.push({
      part_id,
      quantity,
      estimated_cost: estimated_cost || part.price_min,
      notes,
      added_at: new Date(),
    });

    await db('modification_projects')
      .where({ id })
      .update({
        parts_list,
        updated_at: new Date(),
      });

    logger.logBusiness('project_part_added', {
      userId: req.user.id,
      projectId: id,
      partId: part_id,
      partName: part.name,
    });

    res.json({
      success: true,
      message: 'Part added to project',
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}/complete:
 *   post:
 *     summary: Mark project as completed
 *     tags: [Projects]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actual_cost:
 *                 type: number
 *               actual_hours:
 *                 type: integer
 *               performance_gains:
 *                 type: object
 *     responses:
 *       200:
 *         description: Project marked as completed
 */
router.post('/:id/complete',
  requireAuth,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { actual_cost, actual_hours, performance_gains = {} } = req.body;

    // Check ownership
    const project = await db('modification_projects')
      .where({ id, user_id: req.user.id })
      .first();

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const [updated] = await db('modification_projects')
      .where({ id })
      .update({
        status: 'completed',
        completion_date: new Date(),
        actual_cost,
        actual_hours,
        performance_gains,
        updated_at: new Date(),
      })
      .returning('*');

    // Update vehicle total invested
    if (actual_cost) {
      await db('vehicles')
        .where({ id: project.vehicle_id })
        .increment('total_invested', actual_cost);
    }

    logger.logBusiness('project_completed', {
      userId: req.user.id,
      projectId: id,
      actualCost: actual_cost,
      actualHours: actual_hours,
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

module.exports = router;