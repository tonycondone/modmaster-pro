exports.up = function(knex) {
  return knex.schema.createTable('recommendations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('vehicle_id');
    table.uuid('part_id');
    table.uuid('bundle_id');
    table.enum('recommendation_type', ['part', 'bundle', 'service', 'maintenance']).notNullable();
    table.enum('reason', [
      'ai_suggested', 'trending', 'compatibility_match', 'performance_upgrade',
      'maintenance_due', 'user_preference', 'expert_pick', 'deal_alert',
      'complementary_part', 'seasonal', 'safety_critical'
    ]).notNullable();
    table.float('confidence_score').defaultTo(0);
    table.jsonb('reasoning').defaultTo('{}');
    table.jsonb('expected_benefits').defaultTo('{}');
    table.integer('priority').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('was_viewed').defaultTo(false);
    table.boolean('was_clicked').defaultTo(false);
    table.boolean('was_purchased').defaultTo(false);
    table.boolean('was_dismissed').defaultTo(false);
    table.timestamp('viewed_at');
    table.timestamp('clicked_at');
    table.timestamp('purchased_at');
    table.timestamp('dismissed_at');
    table.timestamp('expires_at');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('CASCADE');
    table.foreign('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.foreign('bundle_id').references('id').inTable('smart_bundles').onDelete('CASCADE');
    
    // Indexes
    table.index('user_id');
    table.index('vehicle_id');
    table.index('part_id');
    table.index('bundle_id');
    table.index('recommendation_type');
    table.index('reason');
    table.index('is_active');
    table.index('created_at');
    table.index('expires_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('recommendations');
};