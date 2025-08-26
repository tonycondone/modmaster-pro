exports.up = function(knex) {
  return knex.schema.createTable('vehicles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('vin', 17).unique();
    table.string('make', 100).notNullable();
    table.string('model', 100).notNullable();
    table.integer('year').notNullable();
    table.string('trim', 100);
    table.string('engine_type', 200);
    table.string('engine_displacement', 50);
    table.string('transmission', 100);
    table.string('drivetrain', 50);
    table.string('body_style', 50);
    table.string('exterior_color', 50);
    table.string('interior_color', 50);
    table.integer('mileage');
    table.string('license_plate', 20);
    table.string('nickname', 100);
    table.text('description');
    table.jsonb('specifications').defaultTo('{}');
    table.jsonb('modifications').defaultTo('[]');
    table.jsonb('maintenance_history').defaultTo('[]');
    table.jsonb('performance_data').defaultTo('{}');
    table.jsonb('images').defaultTo('[]');
    table.boolean('is_primary').defaultTo(false);
    table.boolean('is_public').defaultTo(true);
    table.integer('views_count').defaultTo(0);
    table.integer('likes_count').defaultTo(0);
    table.decimal('total_invested', 10, 2).defaultTo(0);
    table.timestamp('purchase_date');
    table.decimal('purchase_price', 10, 2);
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes
    table.index('user_id');
    table.index('vin');
    table.index(['make', 'model', 'year']);
    table.index('is_public');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vehicles');
};