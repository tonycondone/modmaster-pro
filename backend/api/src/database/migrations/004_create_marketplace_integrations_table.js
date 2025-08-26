exports.up = function(knex) {
  return knex.schema.createTable('marketplace_integrations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('part_id').notNullable();
    table.enum('platform', [
      'amazon', 'ebay', 'autozone', 'summit_racing', 'jegs', 
      'advance_auto', 'oreilly', 'tire_rack', 'rock_auto',
      'walmart', 'best_buy', 'fcpeuro', 'ecs_tuning'
    ]).notNullable();
    table.string('external_id', 255);
    table.string('external_url', 500);
    table.decimal('current_price', 10, 2);
    table.decimal('original_price', 10, 2);
    table.float('discount_percentage');
    table.enum('availability', ['in_stock', 'low_stock', 'out_of_stock', 'discontinued']).defaultTo('in_stock');
    table.integer('stock_quantity');
    table.decimal('shipping_cost', 10, 2);
    table.string('shipping_time', 100);
    table.float('seller_rating');
    table.string('seller_name', 255);
    table.boolean('prime_eligible').defaultTo(false);
    table.boolean('free_shipping').defaultTo(false);
    table.jsonb('return_policy').defaultTo('{}');
    table.jsonb('warranty_info').defaultTo('{}');
    table.integer('customer_reviews_count').defaultTo(0);
    table.float('average_rating');
    table.jsonb('price_history').defaultTo('[]');
    table.decimal('deal_alert_threshold', 10, 2);
    table.boolean('is_tracked').defaultTo(true);
    table.timestamp('last_checked_at');
    table.timestamp('last_updated_at');
    table.integer('check_frequency_hours').defaultTo(6);
    table.jsonb('additional_data').defaultTo('{}');
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('part_id').references('id').inTable('parts').onDelete('CASCADE');
    
    // Indexes
    table.index('part_id');
    table.index('platform');
    table.index('external_id');
    table.index(['part_id', 'platform']);
    table.index('current_price');
    table.index('availability');
    table.index('last_checked_at');
    table.index('is_tracked');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('marketplace_integrations');
};