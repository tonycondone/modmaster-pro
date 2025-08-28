exports.up = function(knex) {
  return knex.schema.createTable('user_activities', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('activity_type', [
      'login',
      'logout',
      'vehicle_added',
      'vehicle_updated',
      'vehicle_deleted',
      'scan_created',
      'scan_completed',
      'part_saved',
      'part_unsaved',
      'order_placed',
      'order_cancelled',
      'review_posted',
      'profile_updated',
      'password_changed',
      'payment_method_added',
      'payment_method_removed'
    ]).notNullable();
    table.jsonb('details').defaultTo('{}');
    table.string('ip_address');
    table.string('user_agent');
    table.jsonb('location_data').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('activity_type');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_activities');
};