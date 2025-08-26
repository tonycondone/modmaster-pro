const { Pool } = require('pg');
const config = require('../config');
const logger = require('./logger');

let pool;

const connectDatabase = async () => {
  try {
    pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    logger.info('Connected to PostgreSQL database');
    
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  logger.debug('Executed query', {
    text,
    duration,
    rows: res.rowCount,
  });
  
  return res;
};

module.exports = {
  connectDatabase,
  query,
};