exports.up = function(knex) {
  return knex.schema.createTable('part_compatibilities', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign key to parts
    table.uuid('part_id').notNullable()
      .references('id').inTable('parts')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Vehicle compatibility information
    table.string('make', 100).notNullable();
    table.string('model', 100).notNullable();
    table.integer('year_start').notNullable();
    table.integer('year_end').notNullable();
    
    // Optional compatibility restrictions
    table.string('engine', 100).comment('Specific engine requirement (e.g., "2.5L", "V6")');
    table.string('trim', 100).comment('Specific trim level requirement');
    
    // Universal part flag
    table.boolean('universal').notNullable().defaultTo(false)
      .comment('Whether this part is universal (fits all vehicles)');
    
    // Additional information
    table.text('notes').comment('Additional compatibility notes or restrictions');
    
    // Verification tracking
    table.boolean('verified').notNullable().defaultTo(false)
      .comment('Whether this compatibility has been verified');
    table.uuid('verified_by')
      .references('id').inTable('users')
      .onDelete('SET NULL').onUpdate('CASCADE');
    table.timestamp('verified_at');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('part_id');
    table.index(['make', 'model']);
    table.index(['year_start', 'year_end']);
    table.index('engine');
    table.index('trim');
    table.index('universal');
    table.index('verified');
    table.index(['part_id', 'make', 'model']);
    
    // Constraints removed for compatibility
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('part_compatibilities');
};