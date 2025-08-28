exports.up = function(knex) {
  return knex.schema.createTable('scan_parts', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('scan_id').notNullable().references('id').inTable('vehicle_scans').onDelete('CASCADE');
    table.uuid('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.decimal('confidence_score', 5, 4).notNullable();
    table.jsonb('location').defaultTo('{}'); // Bounding box coordinates
    table.jsonb('ai_metadata').defaultTo('{}'); // Additional AI detection data
    table.string('detected_condition');
    table.jsonb('detected_issues').defaultTo('[]');
    table.boolean('user_confirmed').defaultTo(false);
    table.timestamp('confirmed_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('scan_id');
    table.index('part_id');
    table.index('confidence_score');
    table.unique(['scan_id', 'part_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('scan_parts');
};