exports.up = function(knex) {
  return knex.schema.createTable('part_compatibility', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('part_id').notNullable();
    table.string('make', 100);
    table.string('model', 100);
    table.integer('year_start');
    table.integer('year_end');
    table.string('trim', 100);
    table.string('engine', 200);
    table.string('transmission', 100);
    table.string('drivetrain', 50);
    table.string('body_style', 50);
    table.jsonb('additional_criteria').defaultTo('{}');
    table.enum('fitment_type', ['direct_fit', 'universal', 'requires_modification', 'custom']).defaultTo('direct_fit');
    table.jsonb('fitment_notes').defaultTo('[]');
    table.jsonb('required_modifications').defaultTo('[]');
    table.jsonb('incompatible_with').defaultTo('[]');
    table.boolean('is_verified').defaultTo(false);
    table.string('verified_by');
    table.timestamp('verified_at');
    table.enum('source', ['manufacturer', 'ai_generated', 'user_submitted', 'expert_verified']).defaultTo('manufacturer');
    table.float('confidence_score').defaultTo(1.0);
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('part_id').references('id').inTable('parts').onDelete('CASCADE');
    
    // Indexes
    table.index('part_id');
    table.index(['make', 'model']);
    table.index(['make', 'model', 'year_start', 'year_end']);
    table.index('fitment_type');
    table.index('is_verified');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('part_compatibility');
};