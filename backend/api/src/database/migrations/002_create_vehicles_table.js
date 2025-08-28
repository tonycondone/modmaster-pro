exports.up = function(knex) {
  return knex.schema.createTable('vehicles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('make', 100).notNullable();
    table.string('model', 100).notNullable();
    table.integer('year').notNullable();
    table.string('variant', 100);
    table.string('engine', 100);
    table.string('transmission', 50);
    table.string('fuel_type', 50);
    table.string('body_type', 50);
    table.string('vin', 17).unique();
    table.string('license_plate', 20);
    table.string('color', 50);
    table.integer('mileage');
    table.decimal('purchase_price', 10, 2);
    table.date('purchase_date');
    table.jsonb('specifications').defaultTo('{}');
    table.jsonb('modifications').defaultTo('[]');
    table.jsonb('maintenance_history').defaultTo('[]');
    table.string('image_url', 500);
    table.boolean('is_primary').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index(['make', 'model', 'year']);
    table.index('is_primary');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vehicles');
}; 