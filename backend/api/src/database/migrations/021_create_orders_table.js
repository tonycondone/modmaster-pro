exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('order_number').unique().notNullable();
    table.json('items').notNullable();
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('shipping_cost', 10, 2).notNullable().defaultTo(0);
    table.decimal('tax_amount', 10, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.enum('status', [
      'pending', 'confirmed', 'processing', 'shipped', 
      'delivered', 'cancelled', 'refunded', 'failed'
    ]).defaultTo('pending');
    table.json('shipping_address').notNullable();
    table.json('billing_address').notNullable();
    table.string('tracking_number').nullable();
    table.timestamp('shipped_at').nullable();
    table.timestamp('delivered_at').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['status']);
    table.index(['order_number']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};