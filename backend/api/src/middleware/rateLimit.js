const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redis } = require('../utils/redis');
const config = require('../config');
const { RateLimitError } = require('./errorHandler');

// Create rate limiter with Redis store
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
    handler: (req, res, next) => {
      next(new RateLimitError('Too many requests, please try again later'));
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? `user:${req.user.id}` : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for certain conditions
      if (req.user && req.user.role === 'admin') {
        return true;
      }
      return false;
    },
  };

  // Use Redis store if Redis is available
  if (redis) {
    defaultOptions.store = new RedisStore({
      client: redis,
      prefix: 'rl:',
    });
  }

  return rateLimit({ ...defaultOptions, ...options });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter
  api: createRateLimiter(),

  // Authentication endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: false,
    keyGenerator: (req) => req.ip, // Always use IP for auth endpoints
  }),

  // Password reset (very strict)
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    skipSuccessfulRequests: false,
    keyGenerator: (req) => req.ip,
  }),

  // File upload endpoints
  upload: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 uploads per window
    skipSuccessfulRequests: false,
  }),

  // Search endpoints
  search: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
  }),

  // Scraping endpoints (for premium users)
  scraping: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 requests per hour
    skip: (req) => {
      // Higher limits for premium users
      if (req.user) {
        if (req.user.subscription_tier === 'pro') return false;
        if (req.user.subscription_tier === 'shop') return true; // No limit for shop tier
      }
      return false;
    },
  }),

  // AI service endpoints
  ai: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 requests per hour
    keyGenerator: (req) => {
      return req.user ? `ai:user:${req.user.id}` : `ai:ip:${req.ip}`;
    },
  }),

  // Dynamic rate limiter based on user tier
  dynamic: (req, res, next) => {
    // Get rate limit from request (set by tierBasedRateLimit middleware)
    const limit = req.rateLimit || {
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
    };

    const dynamicLimiter = createRateLimiter({
      windowMs: limit.windowMs,
      max: limit.max,
      keyGenerator: (req) => {
        return req.user ? `dynamic:user:${req.user.id}` : `dynamic:ip:${req.ip}`;
      },
    });

    dynamicLimiter(req, res, next);
  },
};

// Rate limit info endpoint
const getRateLimitInfo = async (req, res) => {
  const key = req.user ? `user:${req.user.id}` : req.ip;
  const prefix = 'rl:';
  
  try {
    // Get all rate limit keys for this user/IP
    const keys = await redis.keys(`${prefix}*${key}*`);
    const info = {};

    for (const fullKey of keys) {
      const ttl = await redis.ttl(fullKey);
      const count = await redis.get(fullKey);
      const keyParts = fullKey.replace(prefix, '').split(':');
      const endpoint = keyParts[0] || 'api';

      info[endpoint] = {
        count: parseInt(count, 10) || 0,
        resetInSeconds: ttl > 0 ? ttl : 0,
        limit: config.rateLimit.maxRequests,
      };
    }

    res.json({
      success: true,
      data: {
        key,
        limits: info,
        tier: req.user?.subscription_tier || 'anonymous',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit info',
    });
  }
};

// Middleware to add rate limit headers
const addRateLimitHeaders = (req, res, next) => {
  // Add custom headers after rate limiter runs
  const originalSend = res.send;
  res.send = function(data) {
    if (req.user) {
      res.set('X-RateLimit-Tier', req.user.subscription_tier);
    }
    originalSend.call(this, data);
  };
  next();
};

module.exports = {
  rateLimiters,
  createRateLimiter,
  getRateLimitInfo,
  addRateLimitHeaders,
};