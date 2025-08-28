exports.up = function(knex) {
  return knex.schema.createTable('parts', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.string('category').notNullable();
    table.string('subcategory');
    table.string('manufacturer');
    table.string('brand');
    table.string('oem_number').index();
    table.string('universal_part_number').index();
    table.jsonb('alternate_part_numbers').defaultTo('[]');
    table.enum('condition', ['new', 'used', 'refurbished', 'remanufactured']).defaultTo('new');
    table.decimal('price', 10, 2);
    table.jsonb('price_history').defaultTo('[]');
    table.integer('quantity').defaultTo(1);
    table.jsonb('specifications').defaultTo('{}');
    table.jsonb('dimensions').defaultTo('{}');
    table.decimal('weight', 8, 2);
    table.string('weight_unit').defaultTo('lbs');
    table.jsonb('vehicle_compatibility').defaultTo('[]');
    table.jsonb('images').defaultTo('[]');
    table.string('primary_image_url');
    table.uuid('seller_id').references('id').inTable('users');
    table.enum('listing_type', ['marketplace', 'user', 'affiliate']).defaultTo('marketplace');
    table.jsonb('marketplace_data').defaultTo('{}');
    table.string('location');
    table.point('coordinates');
    table.boolean('shipping_available').defaultTo(true);
    table.decimal('shipping_cost', 8, 2);
    table.jsonb('shipping_options').defaultTo('[]');
    table.decimal('average_rating', 3, 2).defaultTo(0);
    table.integer('review_count').defaultTo(0);
    table.integer('view_count').defaultTo(0);
    table.integer('save_count').defaultTo(0);
    table.integer('scan_count').defaultTo(0);
    table.jsonb('tags').defaultTo('[]');
    table.enum('status', ['active', 'sold', 'pending', 'deleted']).defaultTo('active');
    table.timestamp('listed_at').defaultTo(knex.fn.now());
    table.timestamp('sold_at');
    table.timestamp('deleted_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('category');
    table.index('manufacturer');
    table.index('condition');
    table.index('status');
    table.index('seller_id');
    table.index('created_at');
    
    // Full text search index (PostgreSQL specific)
    table.index(knex.raw('to_tsvector(\'english\', name || \' \' || COALESCE(description, \'\'))'), 'parts_search_idx', 'gin');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('parts');
};