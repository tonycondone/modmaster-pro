exports.up = function(knex) {
  return knex.schema.createTable('api_tokens', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('token_hash').unique().notNullable();
    table.jsonb('scopes').defaultTo('[]');
    table.timestamp('last_used_at');
    table.string('last_used_ip');
    table.integer('usage_count').defaultTo(0);
    table.timestamp('expires_at');
    table.timestamp('revoked_at');
    table.text('revocation_reason');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('token_hash');
    table.index('revoked_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('api_tokens');
};