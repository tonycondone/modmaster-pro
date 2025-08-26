const knex = require('knex');
const config = require('../config');
const logger = require('./logger');

// Create Knex instance
const db = knex({
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.name,
    ssl: config.database.sslMode !== 'disable' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
  debug: config.app.debug,
  log: {
    warn(message) {
      logger.warn('Database warning:', message);
    },
    error(message) {
      logger.error('Database error:', message);
    },
    deprecate(message) {
      logger.warn('Database deprecation:', message);
    },
    debug(message) {
      logger.debug('Database debug:', message);
    },
  },
});

// Test database connection
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    throw error;
  }
};

// Close database connections
const close = async () => {
  try {
    await db.destroy();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
};

// Export database instance and helpers
module.exports = {
  db,
  testConnection,
  close,
  
  // Transaction helper
  transaction: async (callback) => {
    const trx = await db.transaction();
    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },
  
  // Query builders
  table: (tableName) => db(tableName),
  raw: (query, bindings) => db.raw(query, bindings),
  
  // Pagination helper
  paginate: async (query, page = 1, perPage = 20) => {
    const offset = (page - 1) * perPage;
    
    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);
    
    // Get paginated results
    const results = await query
      .limit(perPage)
      .offset(offset);
    
    return {
      data: results,
      pagination: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.ceil(total / perPage),
        from: offset + 1,
        to: offset + results.length,
      },
    };
  },
};