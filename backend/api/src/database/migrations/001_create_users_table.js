exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('username').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('phone');
    table.string('avatar_url');
    table.text('bio');
    table.string('location');
    table.jsonb('preferences').defaultTo('{}');
    table.jsonb('notification_settings').defaultTo('{}');
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user');
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at');
    table.string('verification_token');
    table.string('reset_password_token');
    table.timestamp('reset_password_expires');
    table.boolean('two_factor_enabled').defaultTo(false);
    table.string('two_factor_secret');
    table.jsonb('two_factor_backup_codes');
    table.string('stripe_customer_id');
    table.string('default_payment_method_id');
    table.string('subscription_id');
    table.string('subscription_status');
    table.string('subscription_plan');
    table.timestamp('subscription_canceled_at');
    table.timestamp('subscription_ended_at');
    table.timestamp('last_login_at');
    table.string('last_login_ip');
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('account_locked_until');
    table.timestamp('deleted_at');
    table.text('deletion_reason');
    table.timestamps(true, true);
    
    // Indexes
    table.index('email');
    table.index('username');
    table.index('stripe_customer_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};