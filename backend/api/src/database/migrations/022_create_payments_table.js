exports.up = function(knex) {
  return knex.schema.createTable('payments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('stripe_payment_intent_id').unique().notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.enum('status', [
      'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
    ]).defaultTo('pending');
    table.string('payment_method').nullable();
    table.string('transaction_id').nullable();
    table.json('processor_response').nullable();
    table.string('failure_reason').nullable();
    table.decimal('refunded_amount', 10, 2).nullable().defaultTo(0);
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['order_id']);
    table.index(['user_id']);
    table.index(['stripe_payment_intent_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('payments');
};