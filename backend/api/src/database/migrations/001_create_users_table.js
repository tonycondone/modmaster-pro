exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).unique().notNullable();
    table.string('username', 100).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('phone', 20);
    table.string('avatar_url', 500);
    table.jsonb('preferences').defaultTo('{}');
    table.enum('role', ['user', 'admin', 'shop_owner', 'moderator']).defaultTo('user');
    table.enum('subscription_tier', ['free', 'basic', 'pro', 'shop']).defaultTo('free');
    table.date('subscription_expires_at');
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_token', 255);
    table.timestamp('verified_at');
    table.string('reset_password_token', 255);
    table.timestamp('reset_password_expires_at');
    table.string('two_factor_secret', 255);
    table.boolean('two_factor_enabled').defaultTo(false);
    table.integer('login_attempts').defaultTo(0);
    table.timestamp('locked_until');
    table.timestamp('last_login_at');
    table.string('last_login_ip', 45);
    table.jsonb('social_auth').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    // Indexes
    table.index('email');
    table.index('username');
    table.index('is_active');
    table.index('role');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};