exports.up = function(knex) {
  return knex.schema.createTable('maintenance', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('vehicle_id').notNullable()
      .references('id').inTable('vehicles')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    table.uuid('user_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Maintenance details
    table.enum('type', [
      'Oil Change',
      'Tire Rotation',
      'Brake Service',
      'Air Filter',
      'Transmission Service',
      'Coolant Flush',
      'Battery Replacement',
      'Spark Plugs',
      'Wheel Alignment',
      'Other'
    ]).notNullable();
    
    table.date('service_date').notNullable();
    table.integer('mileage').notNullable().checkBetween([0, 999999]);
    table.decimal('cost', 10, 2).checkPositive();
    
    // Service provider details (JSON)
    table.jsonb('service_provider').defaultTo('{}')
      .comment('Service provider details: name, address, phone');
    
    // Parts used (JSON array)
    table.jsonb('parts').defaultTo('[]')
      .comment('Array of parts used: name, partNumber, cost');
    
    // Additional fields
    table.text('notes');
    table.jsonb('attachments').defaultTo('[]')
      .comment('Array of attachment URLs (receipts, photos)');
    
    // Next service due (JSON)
    table.jsonb('next_service_due').defaultTo('{}')
      .comment('Next service due: date, mileage');
    
    // Reminder tracking
    table.boolean('reminder_sent').notNullable().defaultTo(false);
    table.timestamp('reminder_sent_at');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}');
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    // Indexes
    table.index('vehicle_id');
    table.index('user_id');
    table.index('type');
    table.index('service_date');
    table.index('mileage');
    table.index('reminder_sent');
    table.index(['vehicle_id', 'service_date']);
    table.index(['vehicle_id', 'type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('maintenance');
};