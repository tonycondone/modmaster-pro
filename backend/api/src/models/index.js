const knex = require('knex');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Knex.js
const db = knex({
  client: 'pg',
  connection: config.database.url,
  pool: {
    min: config.database.poolMin || 2,
    max: config.database.poolMax || 10
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations'
  },
  seeds: {
    directory: './src/database/seeds'
  }
});

// Database connection functions
const connectDatabase = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established successfully');
    return db;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    await db.migrate.latest();
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
};

const runSeeds = async () => {
  try {
    await db.seed.run();
    logger.info('Database seeds completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

// Export database instance and utility functions
module.exports = {
  db,
  connectDatabase,
  runMigrations,
  runSeeds
};