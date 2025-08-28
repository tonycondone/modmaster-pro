exports.up = function(knex) {
  return knex.schema.createTable('saved_parts', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.text('notes');
    table.jsonb('tags').defaultTo('[]');
    table.boolean('price_alert_enabled').defaultTo(false);
    table.decimal('price_alert_threshold', 10, 2);
    table.timestamp('last_viewed_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('part_id');
    table.unique(['user_id', 'part_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('saved_parts');
};