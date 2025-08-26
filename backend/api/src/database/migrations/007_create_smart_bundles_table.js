exports.up = function(knex) {
  return knex.schema.createTable('smart_bundles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.jsonb('primary_vehicle_compatibility').defaultTo('[]');
    table.jsonb('bundle_parts').defaultTo('[]').notNullable();
    table.decimal('total_price', 10, 2);
    table.decimal('bundle_price', 10, 2);
    table.decimal('total_savings', 10, 2);
    table.float('discount_percentage');
    table.jsonb('performance_gains').defaultTo('{}');
    table.jsonb('installation_sequence').defaultTo('[]');
    table.integer('total_install_time_hours');
    table.jsonb('required_tools').defaultTo('[]');
    table.enum('skill_level_required', ['beginner', 'intermediate', 'advanced', 'expert']).defaultTo('intermediate');
    table.float('popularity_score').defaultTo(0);
    table.enum('created_by', ['ai_generated', 'expert_curated', 'community_created', 'manufacturer']).defaultTo('ai_generated');
    table.uuid('creator_id');
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_featured').defaultTo(false);
    table.jsonb('categories').defaultTo('[]');
    table.jsonb('tags').defaultTo('[]');
    table.integer('purchases_count').defaultTo(0);
    table.float('average_rating').defaultTo(0);
    table.integer('reviews_count').defaultTo(0);
    table.jsonb('media').defaultTo('{}');
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('creator_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Indexes
    table.index('name');
    table.index('is_active');
    table.index('is_featured');
    table.index('popularity_score');
    table.index('created_by');
    table.index('created_at');
    table.index(knex.raw('to_tsvector(\'english\', name || \' \' || coalesce(description, \'\'))'), 'bundles_search_idx', 'gin');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('smart_bundles');
};