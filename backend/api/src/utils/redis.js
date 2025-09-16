const redis = require('redis');
const config = require('../config');
const logger = require('./logger');

// Create Redis client
const client = redis.createClient({
  url: config.redis.url,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

// Event handlers
client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('error', (error) => {
  logger.error('Redis client error:', error);
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

// Test Redis connection function
const testConnection = async () => {
  try {
    await client.connect();
    await client.ping();
    logger.info('Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    throw error;
  }
};

// Close Redis connection
const close = async () => {
  try {
    await client.disconnect();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
};

// Promisify Redis methods for easier use
const redisClient = {
  get: (key) => client.get(key),
  set: (key, value) => client.set(key, value),
  setex: (key, seconds, value) => client.setEx(key, seconds, value),
  del: (...keys) => client.del(keys),
  exists: (key) => client.exists(key),
  expire: (key, seconds) => client.expire(key, seconds),
  ttl: (key) => client.ttl(key),
  keys: (pattern) => client.keys(pattern),
  mget: (...keys) => client.mGet(keys),
  mset: (keyValuePairs) => client.mSet(keyValuePairs),
  incr: (key) => client.incr(key),
  decr: (key) => client.decr(key),
  hget: (key, field) => client.hGet(key, field),
  hset: (key, field, value) => client.hSet(key, field, value),
  hgetall: (key) => client.hGetAll(key),
  hdel: (key, ...fields) => client.hDel(key, fields),
  sadd: (key, ...members) => client.sAdd(key, members),
  srem: (key, ...members) => client.sRem(key, members),
  smembers: (key) => client.sMembers(key),
  sismember: (key, member) => client.sIsMember(key, member),
  client: client,
  testConnection,
  close
};

module.exports = redisClient;