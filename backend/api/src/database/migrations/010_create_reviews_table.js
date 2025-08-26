exports.up = function(knex) {
  return knex.schema.createTable('reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('part_id');
    table.uuid('bundle_id');
    table.uuid('project_id');
    table.uuid('vehicle_id');
    table.enum('review_type', ['part', 'bundle', 'project', 'vehicle']).notNullable();
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.string('title', 255);
    table.text('content').notNullable();
    table.jsonb('pros').defaultTo('[]');
    table.jsonb('cons').defaultTo('[]');
    table.boolean('verified_purchase').defaultTo(false);
    table.date('purchase_date');
    table.integer('usage_months');
    table.jsonb('media').defaultTo('[]');
    table.boolean('recommends').defaultTo(true);
    table.enum('installation_difficulty', ['very_easy', 'easy', 'moderate', 'difficult', 'very_difficult']);
    table.integer('installation_time_hours');
    table.jsonb('performance_impact').defaultTo('{}');
    table.integer('helpful_count').defaultTo(0);
    table.integer('unhelpful_count').defaultTo(0);
    table.boolean('is_featured').defaultTo(false);
    table.boolean('is_expert_review').defaultTo(false);
    table.jsonb('expert_credentials').defaultTo('{}');
    table.timestamp('edited_at');
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.foreign('bundle_id').references('id').inTable('smart_bundles').onDelete('CASCADE');
    table.foreign('project_id').references('id').inTable('modification_projects').onDelete('CASCADE');
    table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('CASCADE');
    
    // Indexes
    table.index('user_id');
    table.index('part_id');
    table.index('bundle_id');
    table.index('project_id');
    table.index('vehicle_id');
    table.index('review_type');
    table.index('rating');
    table.index('verified_purchase');
    table.index('is_featured');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('reviews');
};