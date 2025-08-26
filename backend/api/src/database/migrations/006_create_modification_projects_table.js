exports.up = function(knex) {
  return knex.schema.createTable('modification_projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('vehicle_id').notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.enum('status', ['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']).defaultTo('planning');
    table.decimal('budget', 10, 2);
    table.decimal('actual_cost', 10, 2).defaultTo(0);
    table.jsonb('parts_list').defaultTo('[]');
    table.jsonb('purchased_parts').defaultTo('[]');
    table.jsonb('installed_parts').defaultTo('[]');
    table.jsonb('progress_photos').defaultTo('[]');
    table.jsonb('timeline').defaultTo('[]');
    table.jsonb('performance_gains').defaultTo('{}');
    table.jsonb('installation_notes').defaultTo('[]');
    table.enum('difficulty_level', ['beginner', 'intermediate', 'advanced', 'expert']).defaultTo('intermediate');
    table.integer('estimated_hours');
    table.integer('actual_hours');
    table.date('start_date');
    table.date('estimated_completion');
    table.date('completion_date');
    table.boolean('is_public').defaultTo(true);
    table.boolean('is_featured').defaultTo(false);
    table.integer('views_count').defaultTo(0);
    table.integer('likes_count').defaultTo(0);
    table.integer('comments_count').defaultTo(0);
    table.jsonb('tags').defaultTo('[]');
    table.jsonb('collaborators').defaultTo('[]');
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('CASCADE');
    
    // Indexes
    table.index('user_id');
    table.index('vehicle_id');
    table.index('status');
    table.index('is_public');
    table.index('is_featured');
    table.index('created_at');
    table.index('completion_date');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('modification_projects');
};