exports.up = function(knex) {
  return knex.schema.createTable('login_attempts', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('ip_address').notNullable();
    table.string('user_agent');
    table.boolean('success').notNullable();
    table.string('failure_reason');
    table.jsonb('location_data').defaultTo('{}');
    table.jsonb('device_info').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('email');
    table.index('ip_address');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('login_attempts');
};