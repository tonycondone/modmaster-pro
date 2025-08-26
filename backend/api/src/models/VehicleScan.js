const { db } = require('../utils/database');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class VehicleScan {
  static tableName = 'vehicle_scans';

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
    const { page = 1, limit = 20, sort = 'created_at:desc' } = options;
    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    const query = db(this.tableName)
      .where({ user_id: userId });

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get paginated results with vehicle info
    const scans = await query
      .select(
        'vehicle_scans.*',
        'vehicles.make',
        'vehicles.model',
        'vehicles.year',
        'vehicles.nickname'
      )
      .leftJoin('vehicles', 'vehicle_scans.vehicle_id', 'vehicles.id')
      .orderBy(`vehicle_scans.${sortField}`, sortOrder)
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
  static async create(userId, scanData) {
    const {
      vehicle_id,
      scan_type,
      images = [],
    } = scanData;

    // Validate images
    if (!images.length) {
      throw new ValidationError('At least one image is required');
    }

    if (images.length > 10) {
      throw new ValidationError('Maximum 10 images allowed per scan');
    }

    // Create scan
    const [scan] = await db(this.tableName)
      .insert({
        user_id: userId,
        vehicle_id,
        scan_type,
        images,
        status: 'pending',
        ai_model_version: process.env.AI_MODEL_VERSION || '1.0',
        created_at: new Date(),
        updated_at: new Date(),
        started_at: new Date(),
      })
      .returning('*');

    return scan;
  }

  // Update scan status
  static async updateStatus(id, status, error = null) {
    const updates = {
      status,
      updated_at: new Date(),
    };

    if (status === 'completed') {
      updates.completed_at = new Date();
    }

    if (error) {
      updates.error_message = error;
    }

    const [scan] = await db(this.tableName)
      .where({ id })
      .update(updates)
      .returning('*');

    return scan;
  }

  // Update scan results
  static async updateResults(id, results) {
    const {
      ai_results = {},
      detected_parts = [],
      detected_modifications = [],
      detected_vin,
      detected_vehicle_info = {},
      confidence_score = 0,
      processing_time_ms,
    } = results;

    const scan = await this.findById(id);

    const updates = {
      ai_results,
      detected_parts,
      detected_modifications,
      confidence_score,
      processing_time_ms,
      status: 'completed',
      completed_at: new Date(),
      updated_at: new Date(),
    };

    // Update VIN if detected and scan type includes VIN
    if (detected_vin && ['vin', 'full_vehicle'].includes(scan.scan_type)) {
      updates.detected_vin = detected_vin;
      updates.detected_vehicle_info = detected_vehicle_info;
    }

    const [updated] = await db(this.tableName)
      .where({ id })
      .update(updates)
      .returning('*');

    // If VIN was detected and vehicle_id is provided, update vehicle VIN
    if (detected_vin && scan.vehicle_id) {
      await db('vehicles')
        .where({ id: scan.vehicle_id })
        .whereNull('vin')
        .update({ vin: detected_vin });
    }

    return updated;
  }

  // Get scan with full details
  static async getFullDetails(id, userId) {
    const scan = await this.findById(id);

    // Check ownership
    if (scan.user_id !== userId) {
      throw new NotFoundError('Scan not found');
    }

    // Get vehicle info if linked
    let vehicle = null;
    if (scan.vehicle_id) {
      vehicle = await db('vehicles')
        .where({ id: scan.vehicle_id })
        .select('id', 'make', 'model', 'year', 'nickname')
        .first();
    }

    // Get detected parts details
    let partDetails = [];
    if (scan.detected_parts && scan.detected_parts.length > 0) {
      const partIds = scan.detected_parts
        .filter(p => p.part_id)
        .map(p => p.part_id);

      if (partIds.length > 0) {
        const parts = await db('parts')
          .whereIn('id', partIds)
          .select('id', 'name', 'part_number', 'manufacturer', 'category', 'price_min', 'price_max');

        // Map parts to detected parts
        partDetails = scan.detected_parts.map(dp => {
          const part = parts.find(p => p.id === dp.part_id);
          return {
            ...dp,
            part_details: part || null,
          };
        });
      }
    }

    return {
      ...scan,
      vehicle,
      detected_parts_with_details: partDetails,
    };
  }

  // Get scan statistics for user
  static async getUserStats(userId) {
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_scans,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_scans,
        COUNT(DISTINCT vehicle_id) as vehicles_scanned,
        COUNT(CASE WHEN scan_type = 'engine_bay' THEN 1 END) as engine_scans,
        COUNT(CASE WHEN scan_type = 'vin' THEN 1 END) as vin_scans,
        AVG(CASE WHEN status = 'completed' THEN confidence_score END) as avg_confidence,
        AVG(CASE WHEN status = 'completed' THEN processing_time_ms END) as avg_processing_time
      FROM vehicle_scans
      WHERE user_id = ?
    `, [userId]);

    return stats.rows[0] || {};
  }

  // Get recent scans across platform
  static async getRecentScans(options = {}) {
    const { limit = 10 } = options;

    const scans = await db(this.tableName)
      .select(
        'vehicle_scans.id',
        'vehicle_scans.scan_type',
        'vehicle_scans.confidence_score',
        'vehicle_scans.created_at',
        'vehicles.make',
        'vehicles.model',
        'vehicles.year',
        'users.username',
        'users.avatar_url'
      )
      .join('users', 'vehicle_scans.user_id', 'users.id')
      .leftJoin('vehicles', 'vehicle_scans.vehicle_id', 'vehicles.id')
      .where('vehicle_scans.status', 'completed')
      .where('vehicle_scans.confidence_score', '>=', 0.7)
      .orderBy('vehicle_scans.created_at', 'desc')
      .limit(limit);

    return scans;
  }

  // Delete scan
  static async delete(id, userId) {
    const scan = await this.findById(id);
    
    if (scan.user_id !== userId) {
      throw new NotFoundError('Scan not found');
    }

    await db(this.tableName)
      .where({ id })
      .delete();

    return { success: true };
  }
}

module.exports = VehicleScan;