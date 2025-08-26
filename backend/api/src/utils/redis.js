const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

// Create Redis client
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.slice(0, targetError.length) === targetError) {
      // Only reconnect when the error starts with "READONLY"
      return true;
    }
    return false;
  },
});

// Event handlers
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redis.on('close', () => {
  logger.warn('Redis client connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Test Redis connection
const testConnection = async () => {
  try {
    await redis.ping();
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
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
};

// Cache helpers
const cache = {
  // Get value from cache
  get: async (key) => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  // Set value in cache
  set: async (key, value, ttl = config.performance.cache.defaultTtl) => {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  // Delete value from cache
  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  // Delete multiple keys by pattern
  delByPattern: async (pattern) => {
    try {
      const keys = await redis.keys(`${config.redis.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        // Remove prefix from keys before deletion
        const cleanKeys = keys.map(key => key.replace(config.redis.keyPrefix, ''));
        await redis.del(...cleanKeys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete by pattern error for ${pattern}:`, error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  // Get remaining TTL
  ttl: async (key) => {
    try {
      const ttl = await redis.ttl(key);
      return ttl;
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  },

  // Set TTL on existing key
  expire: async (key, ttl) => {
    try {
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  },

  // Cache with refresh function
  getOrSet: async (key, fetchFunction, ttl = config.performance.cache.defaultTtl) => {
    try {
      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const freshData = await fetchFunction();
      
      // Store in cache
      await cache.set(key, freshData, ttl);
      
      return freshData;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      // If fetch fails, try to return stale cache
      const stale = await cache.get(key);
      if (stale !== null) {
        logger.warn(`Returning stale cache for key ${key}`);
        return stale;
      }
      throw error;
    }
  },

  // Clear all cache
  flush: async () => {
    try {
      await redis.flushdb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  },
};

// Rate limiting helpers
const rateLimiter = {
  // Check if rate limit exceeded
  check: async (key, limit, window) => {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, window);
      }
      return current <= limit;
    } catch (error) {
      logger.error(`Rate limit check error for key ${key}:`, error);
      return true; // Allow on error
    }
  },

  // Get remaining count
  remaining: async (key, limit) => {
    try {
      const current = await redis.get(key);
      const used = current ? parseInt(current, 10) : 0;
      return Math.max(0, limit - used);
    } catch (error) {
      logger.error(`Rate limit remaining error for key ${key}:`, error);
      return limit;
    }
  },

  // Reset rate limit
  reset: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Rate limit reset error for key ${key}:`, error);
      return false;
    }
  },
};

// Session helpers
const session = {
  // Create session
  create: async (sessionId, data, ttl = 86400) => {
    try {
      const key = `session:${sessionId}`;
      await cache.set(key, data, ttl);
      return true;
    } catch (error) {
      logger.error(`Session create error for ${sessionId}:`, error);
      return false;
    }
  },

  // Get session
  get: async (sessionId) => {
    try {
      const key = `session:${sessionId}`;
      return await cache.get(key);
    } catch (error) {
      logger.error(`Session get error for ${sessionId}:`, error);
      return null;
    }
  },

  // Update session
  update: async (sessionId, data) => {
    try {
      const key = `session:${sessionId}`;
      const ttl = await cache.ttl(key);
      if (ttl > 0) {
        await cache.set(key, data, ttl);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Session update error for ${sessionId}:`, error);
      return false;
    }
  },

  // Destroy session
  destroy: async (sessionId) => {
    try {
      const key = `session:${sessionId}`;
      await cache.del(key);
      return true;
    } catch (error) {
      logger.error(`Session destroy error for ${sessionId}:`, error);
      return false;
    }
  },
};

// Export Redis client and helpers
module.exports = {
  redis,
  testConnection,
  close,
  cache,
  rateLimiter,
  session,
};