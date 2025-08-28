exports.up = function(knex) {
  return knex.schema.createTable('orders', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('order_number').unique().notNullable();
    table.enum('status', [
      'pending_payment',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'payment_failed'
    ]).defaultTo('pending_payment');
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('tax_amount', 10, 2).defaultTo(0);
    table.decimal('shipping_cost', 10, 2).defaultTo(0);
    table.decimal('discount_amount', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.jsonb('items').defaultTo('[]');
    table.jsonb('shipping_address').notNullable();
    table.jsonb('billing_address').notNullable();
    table.string('shipping_method');
    table.string('tracking_number');
    table.string('carrier');
    table.jsonb('shipping_updates').defaultTo('[]');
    table.string('payment_method');
    table.string('stripe_payment_intent_id');
    table.string('stripe_charge_id');
    table.jsonb('payment_details').defaultTo('{}');
    table.timestamp('paid_at');
    table.timestamp('shipped_at');
    table.timestamp('delivered_at');
    table.timestamp('cancelled_at');
    table.text('cancellation_reason');
    table.timestamp('refunded_at');
    table.decimal('refund_amount', 10, 2);
    table.text('refund_reason');
    table.text('failure_reason');
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('order_number');
    table.index('status');
    table.index('stripe_payment_intent_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};