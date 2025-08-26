const { db } = require('../utils/database');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class Part {
  static tableName = 'parts';

  // Find part by ID
  static async findById(id) {
    const part = await db(this.tableName)
      .where({ id })
      .first();
    
    if (!part) {
      throw new NotFoundError('Part not found');
    }
    
    return part;
  }

  // Find part by part number
  static async findByPartNumber(partNumber) {
    return db(this.tableName)
      .where({ part_number: partNumber })
      .first();
  }

  // Search parts
  static async search(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = 'trending_score:desc',
      category,
      subcategory,
      manufacturer,
      brand,
      min_price,
      max_price,
      min_rating,
      brand_tier,
      compatibility_vehicle_id,
    } = options;

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    let dbQuery = db(this.tableName)
      .where({ is_active: true });

    // Apply search query
    if (query) {
      // Use PostgreSQL full-text search if available
      if (db.client.config.client === 'pg') {
        dbQuery = dbQuery.whereRaw(
          "to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', ?)",
          [query]
        );
      } else {
        // Fallback to LIKE search
        dbQuery = dbQuery.where(function() {
          this.where('name', 'ilike', `%${query}%`)
            .orWhere('description', 'ilike', `%${query}%`)
            .orWhere('part_number', 'ilike', `%${query}%`)
            .orWhere('universal_part_number', 'ilike', `%${query}%`);
        });
      }
    }

    // Apply filters
    if (category) {
      dbQuery = dbQuery.where('category', 'ilike', category);
    }

    if (subcategory) {
      dbQuery = dbQuery.where('subcategory', 'ilike', subcategory);
    }

    if (manufacturer) {
      dbQuery = dbQuery.where('manufacturer', 'ilike', manufacturer);
    }

    if (brand) {
      dbQuery = dbQuery.where('brand', 'ilike', brand);
    }

    if (brand_tier) {
      dbQuery = dbQuery.where({ brand_tier });
    }

    if (min_price) {
      dbQuery = dbQuery.where('price_min', '>=', min_price);
    }

    if (max_price) {
      dbQuery = dbQuery.where('price_max', '<=', max_price);
    }

    if (min_rating) {
      dbQuery = dbQuery.where('quality_rating', '>=', min_rating);
    }

    // If checking compatibility with a specific vehicle
    if (compatibility_vehicle_id) {
      const vehicle = await db('vehicles')
        .where({ id: compatibility_vehicle_id })
        .first();
      
      if (vehicle) {
        dbQuery = dbQuery
          .leftJoin('part_compatibility as pc', 'parts.id', 'pc.part_id')
          .where(function() {
            this.where(function() {
              this.where('pc.make', 'ilike', vehicle.make)
                .where('pc.model', 'ilike', vehicle.model)
                .where('pc.year_start', '<=', vehicle.year)
                .where('pc.year_end', '>=', vehicle.year);
            }).orWhere('pc.fitment_type', 'universal');
          })
          .groupBy('parts.id');
      }
    }

    // Get total count
    const countQuery = dbQuery.clone();
    const [{ count }] = await countQuery
      .clearSelect()
      .clearOrder()
      .count('* as count');

    // Get paginated results
    const parts = await dbQuery
      .select('parts.*')
      .orderBy(`parts.${sortField}`, sortOrder)
      .limit(limit)
      .offset(offset);

    // Get marketplace integrations for each part
    const partIds = parts.map(p => p.id);
    const integrations = await db('marketplace_integrations')
      .whereIn('part_id', partIds)
      .where('is_tracked', true)
      .select('part_id', 'platform', 'current_price', 'availability');

    // Group integrations by part
    const integrationsByPart = integrations.reduce((acc, int) => {
      if (!acc[int.part_id]) {
        acc[int.part_id] = [];
      }
      acc[int.part_id].push(int);
      return acc;
    }, {});

    // Add integrations to parts
    const partsWithIntegrations = parts.map(part => ({
      ...part,
      marketplace_integrations: integrationsByPart[part.id] || [],
      lowest_price: integrationsByPart[part.id]
        ? Math.min(...integrationsByPart[part.id].map(i => i.current_price).filter(p => p))
        : part.price_min,
    }));

    return {
      data: partsWithIntegrations,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  // Get categories
  static async getCategories() {
    const categories = await db(this.tableName)
      .distinct('category')
      .whereNotNull('category')
      .where({ is_active: true })
      .orderBy('category');

    return categories.map(c => c.category);
  }

  // Get subcategories for a category
  static async getSubcategories(category) {
    const subcategories = await db(this.tableName)
      .distinct('subcategory')
      .where({ category, is_active: true })
      .whereNotNull('subcategory')
      .orderBy('subcategory');

    return subcategories.map(s => s.subcategory);
  }

  // Get manufacturers
  static async getManufacturers(category = null) {
    let query = db(this.tableName)
      .distinct('manufacturer')
      .whereNotNull('manufacturer')
      .where({ is_active: true });

    if (category) {
      query = query.where({ category });
    }

    const manufacturers = await query.orderBy('manufacturer');
    return manufacturers.map(m => m.manufacturer);
  }

  // Get trending parts
  static async getTrending(options = {}) {
    const { limit = 10, category = null } = options;

    let query = db(this.tableName)
      .where({ is_active: true })
      .where('trending_score', '>', 0);

    if (category) {
      query = query.where({ category });
    }

    const parts = await query
      .orderBy('trending_score', 'desc')
      .limit(limit);

    return parts;
  }

  // Get compatible parts for a vehicle
  static async getCompatibleParts(vehicleId, options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      sort = 'quality_rating:desc',
    } = options;

    const vehicle = await db('vehicles')
      .where({ id: vehicleId })
      .first();

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    let query = db('parts as p')
      .join('part_compatibility as pc', 'p.id', 'pc.part_id')
      .where('p.is_active', true)
      .where(function() {
        this.where(function() {
          this.where('pc.make', 'ilike', vehicle.make)
            .where('pc.model', 'ilike', vehicle.model)
            .where('pc.year_start', '<=', vehicle.year)
            .where('pc.year_end', '>=', vehicle.year);
        }).orWhere('pc.fitment_type', 'universal');
      });

    if (category) {
      query = query.where('p.category', 'ilike', category);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');

    // Get paginated results
    const parts = await query
      .select('p.*', 'pc.fitment_type', 'pc.fitment_notes')
      .orderBy(`p.${sortField}`, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: parts,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  // Update trending score
  static async updateTrendingScore(id, score) {
    await db(this.tableName)
      .where({ id })
      .update({
        trending_score: score,
        updated_at: new Date(),
      });
  }

  // Increment social mentions
  static async incrementSocialMentions(id, count = 1) {
    await db(this.tableName)
      .where({ id })
      .increment('social_mentions', count);
  }

  // Get part with all details
  static async getFullDetails(id) {
    const part = await this.findById(id);

    // Get compatibility info
    const compatibility = await db('part_compatibility')
      .where({ part_id: id })
      .orderBy('make', 'asc')
      .orderBy('model', 'asc')
      .orderBy('year_start', 'asc');

    // Get marketplace integrations
    const integrations = await db('marketplace_integrations')
      .where({ part_id: id, is_tracked: true })
      .orderBy('current_price', 'asc');

    // Get reviews
    const reviews = await db('reviews')
      .where({ part_id: id, review_type: 'part' })
      .select(
        'id',
        'user_id',
        'rating',
        'title',
        'content',
        'verified_purchase',
        'recommends',
        'helpful_count',
        'created_at'
      )
      .orderBy('helpful_count', 'desc')
      .limit(10);

    // Get review stats
    const [reviewStats] = await db('reviews')
      .where({ part_id: id, review_type: 'part' })
      .select(
        db.raw('COUNT(*) as total_reviews'),
        db.raw('AVG(rating) as average_rating'),
        db.raw('COUNT(CASE WHEN verified_purchase = true THEN 1 END) as verified_count'),
        db.raw('COUNT(CASE WHEN recommends = true THEN 1 END) as recommend_count')
      );

    return {
      ...part,
      compatibility,
      marketplace_integrations: integrations,
      reviews: {
        items: reviews,
        stats: {
          total: parseInt(reviewStats.total_reviews, 10),
          average_rating: parseFloat(reviewStats.average_rating) || 0,
          verified_count: parseInt(reviewStats.verified_count, 10),
          recommend_percentage: reviewStats.total_reviews > 0
            ? Math.round((reviewStats.recommend_count / reviewStats.total_reviews) * 100)
            : 0,
        },
      },
    };
  }

  // Create part (admin only)
  static async create(partData) {
    const {
      part_number,
      universal_part_number,
      name,
      description,
      category,
      subcategory,
      manufacturer,
      brand,
      brand_tier = 'universal',
      price_min,
      price_max,
      msrp,
      specifications = {},
      compatibility_rules = {},
      warranty_standard = {},
      certifications = [],
      installation_difficulty = 5,
    } = partData;

    // Check if part number already exists
    const existing = await this.findByPartNumber(part_number);
    if (existing) {
      throw new ValidationError('Part number already exists');
    }

    const [part] = await db(this.tableName)
      .insert({
        part_number,
        universal_part_number,
        name,
        description,
        category,
        subcategory,
        manufacturer,
        brand,
        brand_tier,
        price_min,
        price_max,
        msrp,
        specifications,
        compatibility_rules,
        warranty_standard,
        certifications,
        installation_difficulty,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return part;
  }

  // Update part (admin only)
  static async update(id, updateData) {
    const part = await this.findById(id);

    // Remove fields that shouldn't be updated
    const {
      id: _,
      created_at,
      trending_score,
      social_mentions,
      quality_rating,
      reliability_score,
      community_rating,
      expert_endorsed,
      ...safeUpdateData
    } = updateData;

    // Check part number uniqueness if updating
    if (safeUpdateData.part_number && safeUpdateData.part_number !== part.part_number) {
      const existing = await db(this.tableName)
        .where({ part_number: safeUpdateData.part_number })
        .whereNot({ id })
        .first();
      
      if (existing) {
        throw new ValidationError('Part number already exists');
      }
    }

    const [updated] = await db(this.tableName)
      .where({ id })
      .update({
        ...safeUpdateData,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }
}

module.exports = Part;