exports.up = function(knex) {
  return knex.schema.createTable('vehicle_scans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('vehicle_id');
    table.enum('scan_type', ['engine_bay', 'vin', 'part_identification', 'full_vehicle']).notNullable();
    table.jsonb('images').defaultTo('[]').notNullable();
    table.jsonb('ai_results').defaultTo('{}');
    table.jsonb('detected_parts').defaultTo('[]');
    table.jsonb('detected_modifications').defaultTo('[]');
    table.string('detected_vin', 17);
    table.jsonb('detected_vehicle_info').defaultTo('{}');
    table.float('confidence_score').defaultTo(0);
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.text('error_message');
    table.integer('processing_time_ms');
    table.string('ai_model_version', 50);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('SET NULL');
    
    // Indexes
    table.index('user_id');
    table.index('vehicle_id');
    table.index('scan_type');
    table.index('status');
    table.index('detected_vin');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vehicle_scans');
};