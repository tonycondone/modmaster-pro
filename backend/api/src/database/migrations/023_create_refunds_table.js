exports.up = function(knex) {
  return knex.schema.createTable('refunds', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.uuid('payment_id').notNullable().references('id').inTable('payments').onDelete('CASCADE');
    table.string('stripe_refund_id').unique().notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.enum('status', ['pending', 'succeeded', 'failed']).defaultTo('pending');
    table.string('reason').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['order_id']);
    table.index(['payment_id']);
    table.index(['stripe_refund_id']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('refunds');
};