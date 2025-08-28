exports.up = function(knex) {
  return knex.schema.createTable('scans', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('vehicle_id').nullable().references('id').inTable('vehicles').onDelete('SET NULL');
    table.string('image_url').notNullable();
    table.string('image_public_id').nullable();
    table.text('notes').nullable();
    table.enum('status', ['processing', 'completed', 'failed']).defaultTo('processing');
    table.json('results').nullable();
    table.text('error').nullable();
    table.timestamp('processing_started_at').defaultTo(knex.fn.now());
    table.timestamp('processing_completed_at').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['vehicle_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('scans');
};