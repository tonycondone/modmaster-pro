exports.up = function(knex) {
  return knex.schema.createTable('parts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('part_number', 100).notNullable();
    table.string('universal_part_number', 100);
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 100).notNullable();
    table.string('subcategory', 100);
    table.string('manufacturer', 100).notNullable();
    table.string('brand', 100);
    table.enum('brand_tier', ['oem', 'premium_aftermarket', 'budget_aftermarket', 'universal']).defaultTo('universal');
    table.decimal('price_min', 10, 2);
    table.decimal('price_max', 10, 2);
    table.decimal('msrp', 10, 2);
    table.float('availability_score').defaultTo(0);
    table.jsonb('specifications').defaultTo('{}');
    table.jsonb('performance_data').defaultTo('{}');
    table.jsonb('images').defaultTo('[]');
    table.jsonb('installation_media').defaultTo('{}');
    table.jsonb('compatibility_rules').defaultTo('{}');
    table.float('trending_score').defaultTo(0);
    table.float('quality_rating').defaultTo(0);
    table.float('reliability_score').defaultTo(0);
    table.jsonb('warranty_standard').defaultTo('{}');
    table.jsonb('certifications').defaultTo('[]');
    table.jsonb('country_restrictions').defaultTo('[]');
    table.jsonb('seasonal_relevance').defaultTo('{}');
    table.jsonb('target_audience').defaultTo('{}');
    table.integer('social_mentions').defaultTo(0);
    table.boolean('expert_endorsed').defaultTo(false);
    table.float('community_rating').defaultTo(0);
    table.float('installation_difficulty').defaultTo(5);
    table.jsonb('maintenance_requirements').defaultTo('{}');
    table.jsonb('environmental_impact').defaultTo('{}');
    table.text('legal_considerations');
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at');
    table.string('verified_by');
    table.timestamps(true, true);
    
    // Indexes
    table.index('part_number');
    table.index('universal_part_number');
    table.index('name');
    table.index(['category', 'subcategory']);
    table.index('manufacturer');
    table.index('brand');
    table.index('is_active');
    table.index('trending_score');
    table.index('quality_rating');
    table.index('created_at');
    
    // Full text search
    table.index(knex.raw('to_tsvector(\'english\', name || \' \' || coalesce(description, \'\'))'), 'parts_search_idx', 'gin');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('parts');
};