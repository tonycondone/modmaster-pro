exports.up = function(knex) {
  return knex.schema.createTable('compatibility', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.string('vehicle_make', 100).notNullable();
    table.string('vehicle_model', 100).notNullable();
    table.integer('year_from').notNullable();
    table.integer('year_to').notNullable();
    table.string('engine', 100);
    table.string('transmission', 50);
    table.string('trim_level', 100);
    table.enum('compatibility_type', ['direct_fit', 'universal', 'modification_required']).defaultTo('direct_fit');
    table.text('installation_notes');
    table.integer('difficulty_level').checkBetween([1, 5]);
    table.decimal('estimated_install_time', 4, 2); // in hours
    table.boolean('professional_install_required').defaultTo(false);
    table.jsonb('additional_parts_required').defaultTo('[]');
    table.timestamps(true, true);
    
    // Indexes
    table.index('part_id');
    table.index(['vehicle_make', 'vehicle_model']);
    table.index(['year_from', 'year_to']);
    table.index('compatibility_type');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('compatibility');
}; 