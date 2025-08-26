const { db } = require('../utils/database');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class Vehicle {
  static tableName = 'vehicles';

  // Find vehicle by ID
  static async findById(id) {
    const vehicle = await db(this.tableName)
      .where({ id })
      .first();
    
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }
    
    return vehicle;
  }

  // Find vehicles by user ID
  static async findByUserId(userId, options = {}) {
    const { page = 1, limit = 20, sort = 'created_at:desc' } = options;
    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    const query = db(this.tableName)
      .where({ user_id: userId });

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get paginated results
    const vehicles = await query
      .orderBy(sortField, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: vehicles,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  // Create new vehicle
  static async create(userId, vehicleData) {
    const {
      vin,
      make,
      model,
      year,
      trim,
      engine_type,
      engine_displacement,
      transmission,
      drivetrain,
      body_style,
      exterior_color,
      interior_color,
      mileage,
      license_plate,
      nickname,
      description,
      specifications = {},
      purchase_date,
      purchase_price,
      is_primary = false,
      is_public = true,
    } = vehicleData;

    // Check if VIN already exists
    if (vin) {
      const existing = await db(this.tableName)
        .where({ vin })
        .first();
      
      if (existing) {
        throw new ValidationError('VIN already registered');
      }
    }

    // If setting as primary, unset other vehicles
    if (is_primary) {
      await db(this.tableName)
        .where({ user_id: userId })
        .update({ is_primary: false });
    }

    // Create vehicle
    const [vehicle] = await db(this.tableName)
      .insert({
        user_id: userId,
        vin,
        make,
        model,
        year,
        trim,
        engine_type,
        engine_displacement,
        transmission,
        drivetrain,
        body_style,
        exterior_color,
        interior_color,
        mileage,
        license_plate,
        nickname,
        description,
        specifications,
        purchase_date,
        purchase_price,
        is_primary,
        is_public,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return vehicle;
  }

  // Update vehicle
  static async update(id, userId, updateData) {
    // Check ownership
    const vehicle = await this.findById(id);
    if (vehicle.user_id !== userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Remove fields that shouldn't be updated
    const {
      id: _,
      user_id,
      created_at,
      views_count,
      likes_count,
      total_invested,
      ...safeUpdateData
    } = updateData;

    // Check VIN uniqueness if updating
    if (safeUpdateData.vin && safeUpdateData.vin !== vehicle.vin) {
      const existing = await db(this.tableName)
        .where({ vin: safeUpdateData.vin })
        .whereNot({ id })
        .first();
      
      if (existing) {
        throw new ValidationError('VIN already registered');
      }
    }

    // If setting as primary, unset other vehicles
    if (safeUpdateData.is_primary) {
      await db(this.tableName)
        .where({ user_id: userId })
        .whereNot({ id })
        .update({ is_primary: false });
    }

    // Update vehicle
    const [updated] = await db(this.tableName)
      .where({ id })
      .update({
        ...safeUpdateData,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  // Delete vehicle
  static async delete(id, userId) {
    const vehicle = await this.findById(id);
    if (vehicle.user_id !== userId) {
      throw new NotFoundError('Vehicle not found');
    }

    await db(this.tableName)
      .where({ id })
      .delete();

    return { success: true };
  }

  // Add modification to vehicle
  static async addModification(id, userId, modification) {
    const vehicle = await this.findById(id);
    if (vehicle.user_id !== userId) {
      throw new NotFoundError('Vehicle not found');
    }

    const modifications = vehicle.modifications || [];
    modifications.push({
      ...modification,
      added_at: new Date(),
    });

    const [updated] = await db(this.tableName)
      .where({ id })
      .update({
        modifications,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  // Add maintenance record
  static async addMaintenanceRecord(id, userId, record) {
    const vehicle = await this.findById(id);
    if (vehicle.user_id !== userId) {
      throw new NotFoundError('Vehicle not found');
    }

    const maintenance_history = vehicle.maintenance_history || [];
    maintenance_history.push({
      ...record,
      recorded_at: new Date(),
    });

    const [updated] = await db(this.tableName)
      .where({ id })
      .update({
        maintenance_history,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  // Update performance data
  static async updatePerformanceData(id, userId, performanceData) {
    const vehicle = await this.findById(id);
    if (vehicle.user_id !== userId) {
      throw new NotFoundError('Vehicle not found');
    }

    const [updated] = await db(this.tableName)
      .where({ id })
      .update({
        performance_data: {
          ...vehicle.performance_data,
          ...performanceData,
          updated_at: new Date(),
        },
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  // Increment view count
  static async incrementViews(id) {
    await db(this.tableName)
      .where({ id })
      .increment('views_count', 1);
  }

  // Search public vehicles
  static async searchPublic(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at:desc',
      make,
      model,
      year_min,
      year_max,
    } = options;

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    let dbQuery = db(this.tableName)
      .where({ is_public: true });

    // Apply search filters
    if (query) {
      dbQuery = dbQuery.where(function() {
        this.where('nickname', 'ilike', `%${query}%`)
          .orWhere('description', 'ilike', `%${query}%`)
          .orWhere('make', 'ilike', `%${query}%`)
          .orWhere('model', 'ilike', `%${query}%`);
      });
    }

    if (make) {
      dbQuery = dbQuery.where('make', 'ilike', make);
    }

    if (model) {
      dbQuery = dbQuery.where('model', 'ilike', model);
    }

    if (year_min) {
      dbQuery = dbQuery.where('year', '>=', year_min);
    }

    if (year_max) {
      dbQuery = dbQuery.where('year', '<=', year_max);
    }

    // Get total count
    const [{ count }] = await dbQuery.clone().count('* as count');

    // Get paginated results with user info
    const vehicles = await dbQuery
      .select(
        'vehicles.*',
        'users.username',
        'users.avatar_url as owner_avatar'
      )
      .leftJoin('users', 'vehicles.user_id', 'users.id')
      .orderBy(`vehicles.${sortField}`, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: vehicles,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  // Get vehicle statistics
  static async getStats(vehicleId) {
    const stats = await db.raw(`
      SELECT 
        v.id,
        v.total_invested,
        COUNT(DISTINCT mp.id) as projects_count,
        COUNT(DISTINCT vs.id) as scans_count,
        COUNT(DISTINCT r.id) as reviews_count,
        AVG(r.rating) as average_rating
      FROM vehicles v
      LEFT JOIN modification_projects mp ON mp.vehicle_id = v.id
      LEFT JOIN vehicle_scans vs ON vs.vehicle_id = v.id
      LEFT JOIN reviews r ON r.vehicle_id = v.id
      WHERE v.id = ?
      GROUP BY v.id, v.total_invested
    `, [vehicleId]);

    return stats.rows[0] || null;
  }
}

module.exports = Vehicle;