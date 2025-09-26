const { db } = require('../utils/database');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class Scan {
  static tableName = 'scans';

  // Find scan by ID
  static async findById(id) {
    const scan = await db(this.tableName)
      .where({ id })
      .first();
    
    if (!scan) {
      throw new NotFoundError('Scan not found');
    }
    
    return scan;
  }

  // Find scans by user ID
  static async findByUserId(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = 'created_at:desc',
      status,
      vehicleId,
    } = options;

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    let dbQuery = db(this.tableName)
      .where({ user_id: userId });

    // Apply filters
    if (status) {
      dbQuery = dbQuery.where({ status });
    }

    if (vehicleId) {
      dbQuery = dbQuery.where({ vehicle_id: vehicleId });
    }

    // Get total count
    const [{ count }] = await dbQuery.clone().count('* as count');

    // Get paginated results with vehicle info
    const scans = await dbQuery
      .leftJoin('vehicles as v', 'scans.vehicle_id', 'v.id')
      .select(
        'scans.*',
        'v.make as vehicle_make',
        'v.model as vehicle_model',
        'v.year as vehicle_year'
      )
      .orderBy(scans., sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: scans,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  // Create new scan
  static async create(scanData) {
    const {
      user_id,
      vehicle_id,
      image_url,
      image_public_id,
      notes,
      metadata = {},
    } = scanData;

    const [scan] = await db(this.tableName)
      .insert({
        user_id,
        vehicle_id,
        image_url,
        image_public_id,
        notes,
        status: 'processing',
        metadata,
        processing_started_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return scan;
  }

  // Update scan results
  static async updateResults(scanId, updateData) {
    const {
      results,
      status = 'completed',
      error,
      processing_completed_at = new Date(),
    } = updateData;

    const [scan] = await db(this.tableName)
      .where({ id: scanId })
      .update({
        results,
        status,
        error,
        processing_completed_at,
        updated_at: new Date(),
      })
      .returning('*');

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    return scan;
  }

  // Update scan notes
  static async updateNotes(scanId, notes) {
    const [scan] = await db(this.tableName)
      .where({ id: scanId })
      .update({
        notes,
        updated_at: new Date(),
      })
      .returning('*');

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    return scan;
  }

  // Get user statistics
  static async getUserStats(userId) {
    const stats = await db.raw(
      SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_scans,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_scans,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_scans,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as scans_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as scans_this_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as scans_this_month
      FROM scans 
      WHERE user_id = ?
    , [userId]);

    return stats.rows[0] || {};
  }

  // Delete scan
  static async delete(scanId, userId) {
    const [scan] = await db(this.tableName)
      .where({ id: scanId, user_id: userId })
      .del()
      .returning('*');

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    return { success: true };
  }

  // Get scan with full details
  static async getFullDetails(scanId, userId) {
    const scan = await db(this.tableName)
      .leftJoin('vehicles as v', 'scans.vehicle_id', 'v.id')
      .leftJoin('users as u', 'scans.user_id', 'u.id')
      .select(
        'scans.*',
        'v.make as vehicle_make',
        'v.model as vehicle_model',
        'v.year as vehicle_year',
        'u.username as user_username'
      )
      .where('scans.id', scanId)
      .where('scans.user_id', userId)
      .first();

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    return scan;
  }

  // Update scan status
  static async updateStatus(scanId, status, error = null) {
    const updateData = {
      status,
      updated_at: new Date(),
    };

    if (status === 'completed') {
      updateData.processing_completed_at = new Date();
    }

    if (error) {
      updateData.error = error;
    }

    const [scan] = await db(this.tableName)
      .where({ id: scanId })
      .update(updateData)
      .returning('*');

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    return scan;
  }

  // Get recent scans for user
  static async getRecentScans(userId, limit = 5) {
    const scans = await db(this.tableName)
      .leftJoin('vehicles as v', 'scans.vehicle_id', 'v.id')
      .select(
        'scans.id',
        'scans.image_url',
        'scans.status',
        'scans.created_at',
        'v.make as vehicle_make',
        'v.model as vehicle_model',
        'v.year as vehicle_year'
      )
      .where('scans.user_id', userId)
      .orderBy('scans.created_at', 'desc')
      .limit(limit);

    return scans;
  }
}

module.exports = Scan;
