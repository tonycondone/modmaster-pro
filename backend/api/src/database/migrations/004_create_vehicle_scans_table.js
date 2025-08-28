exports.up = function(knex) {
  return knex.schema.createTable('vehicle_scans', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('vehicle_id').references('id').inTable('vehicles').onDelete('SET NULL');
    table.enum('scan_type', ['parts', 'damage', 'vin', 'license_plate', 'full_vehicle']).defaultTo('parts');
    table.string('image_url').notNullable();
    table.jsonb('image_metadata').defaultTo('{}');
    table.jsonb('ai_results').defaultTo('{}');
    table.integer('parts_detected').defaultTo(0);
    table.decimal('confidence_score', 5, 4);
    table.jsonb('detected_issues').defaultTo('[]');
    table.jsonb('recommendations').defaultTo('[]');
    table.text('notes');
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.text('error_message');
    table.integer('processing_time'); // in milliseconds
    table.timestamp('processed_at');
    table.timestamp('completed_at');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('vehicle_id');
    table.index('scan_type');
    table.index('status');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('vehicle_scans');
};