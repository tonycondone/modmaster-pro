const knex = require('knex');
const config = require('../config');
const logger = require('./logger');

// Create database connection
const db = knex({
  client: config.database.client,
  connection: config.database.connection,
  pool: config.database.pool,
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './src/database/seeds'
  }
});

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connection established successfully');
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });

// Export both named and default exports
module.exports = db;
module.exports.db = db;