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

// Test database connection function
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Close database connection
const close = async () => {
  try {
    await db.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

// Export both named and default exports
module.exports = db;
module.exports.db = db;
module.exports.testConnection = testConnection;
module.exports.close = close;