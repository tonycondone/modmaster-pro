exports.up = function(knex) {
  return knex.schema.createTable('maintenance_records', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vehicle_id').notNullable().references('id').inTable('vehicles').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.enum('type', [
      'oil_change',
      'tire_rotation',
      'brake_service',
      'transmission_service',
      'coolant_flush',
      'air_filter',
      'cabin_filter',
      'spark_plugs',
      'battery',
      'inspection',
      'repair',
      'other'
    ]).notNullable();
    table.string('description').notNullable();
    table.date('date').notNullable();
    table.integer('mileage');
    table.decimal('cost', 10, 2);
    table.string('service_provider');
    table.jsonb('parts_used').defaultTo('[]');
    table.jsonb('documents').defaultTo('[]');
    table.text('notes');
    table.date('next_service_date');
    table.integer('next_service_mileage');
    table.boolean('reminder_sent').defaultTo(false);
    table.timestamps(true, true);
    
    // Indexes
    table.index('vehicle_id');
    table.index('user_id');
    table.index('type');
    table.index('date');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('maintenance_records');
};