exports.up = function(knex) {
  return knex.schema.createTable('vehicles', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('make').notNullable();
    table.string('model').notNullable();
    table.integer('year').notNullable();
    table.string('vin').unique();
    table.string('license_plate');
    table.string('color');
    table.integer('mileage');
    table.string('engine_type');
    table.string('transmission_type');
    table.string('fuel_type');
    table.string('drive_type');
    table.string('body_type');
    table.string('trim_level');
    table.jsonb('features').defaultTo('[]');
    table.string('nickname');
    table.text('notes');
    table.string('image_url');
    table.jsonb('images').defaultTo('[]');
    table.boolean('is_primary').defaultTo(false);
    table.jsonb('maintenance_schedule').defaultTo('{}');
    table.date('purchase_date');
    table.decimal('purchase_price', 10, 2);
    table.string('purchase_location');
    table.jsonb('insurance_info').defaultTo('{}');
    table.jsonb('registration_info').defaultTo('{}');
    table.timestamp('deleted_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('vin');
    table.index(['make', 'model', 'year']);
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('vehicles');
};