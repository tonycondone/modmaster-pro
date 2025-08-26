const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let redis;

const connectRedis = async () => {
  try {
    redis = new Redis(config.redis.url);
    
    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });
    
    redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });
    
    // Test connection
    await redis.ping();
    
    return redis;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

module.exports = {
  redis,
  connectRedis,
};