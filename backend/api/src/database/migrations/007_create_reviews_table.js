exports.up = function(knex) {
  return knex.schema.createTable('reviews', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.uuid('seller_id').references('id').inTable('users');
    table.uuid('order_id').references('id').inTable('orders');
    table.enum('review_type', ['part', 'seller', 'buyer']).notNullable();
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.string('title');
    table.text('comment').notNullable();
    table.jsonb('pros').defaultTo('[]');
    table.jsonb('cons').defaultTo('[]');
    table.boolean('verified_purchase').defaultTo(false);
    table.jsonb('images').defaultTo('[]');
    table.integer('helpful_count').defaultTo(0);
    table.integer('unhelpful_count').defaultTo(0);
    table.boolean('featured').defaultTo(false);
    table.enum('status', ['pending', 'approved', 'rejected', 'flagged']).defaultTo('approved');
    table.text('moderation_notes');
    table.timestamp('moderated_at');
    table.uuid('moderated_by').references('id').inTable('users');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('part_id');
    table.index('seller_id');
    table.index('review_type');
    table.index('rating');
    table.index('status');
    table.index('created_at');
    
    // Ensure one review per user per item
    table.unique(['user_id', 'part_id']);
    table.unique(['user_id', 'seller_id', 'order_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('reviews');
};