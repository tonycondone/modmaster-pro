const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const logger = require('../utils/logger');
const config = require('../config');

// Create Redis client for rate limiting
const redisClient = Redis.createClient({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db || 0,
  enable_offline_queue: false
});

redisClient.on('error', (err) => {
  logger.error('Redis client error for rate limiting', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis client connected for rate limiting');
});

/**
 * Create rate limiter with Redis store
 * Falls back to memory store if Redis is unavailable
 */
const createRateLimiter = (options) => {
  const { name, ...limiterOptions } = options;
  
  // Try to use Redis store
  let store;
  try {
    if (redisClient.connected) {
      store = new RedisStore({
        client: redisClient,
        prefix: `rate-limit:${name}:`
      });
    }
  } catch (error) {
    logger.warn('Failed to create Redis store for rate limiting, using memory store', {
      name,
      error: error.message
    });
  }

  return rateLimit({
    store,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip
      });

      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: res.getHeader('Retry-After')
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...limiterOptions
  });
};

/**
 * Rate limiters for different endpoints
 */
const rateLimiters = {
  // Authentication endpoints - Very restrictive
  auth: createRateLimiter({
    name: 'auth',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute per IP
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: false
  }),

  // API endpoints - Standard rate limiting
  api: createRateLimiter({
    name: 'api',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per user
    message: 'Too many API requests, please slow down',
    skipFailedRequests: true
  }),

  // File upload endpoints - Restrictive
  upload: createRateLimiter({
    name: 'upload',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute per user
    message: 'Too many uploads, please wait before uploading more files'
  }),

  // Payment endpoints - Moderate restrictions
  payment: createRateLimiter({
    name: 'payment',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per user
    message: 'Too many payment requests, please wait before trying again'
  }),

  // Scan endpoints - Moderate restrictions
  scan: createRateLimiter({
    name: 'scan',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 scans per minute per user
    message: 'Too many scan requests, please wait before scanning more items'
  }),

  // Search endpoints - Higher limit
  search: createRateLimiter({
    name: 'search',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 searches per minute per user
    message: 'Too many search requests, please slow down'
  }),

  // Password reset - Very restrictive
  passwordReset: createRateLimiter({
    name: 'password-reset',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per 15 minutes per IP
    message: 'Too many password reset attempts, please try again later',
    skipSuccessfulRequests: false
  }),

  // Email verification - Restrictive
  emailVerification: createRateLimiter({
    name: 'email-verification',
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 requests per 5 minutes per IP
    message: 'Too many verification attempts, please try again later'
  }),

  // Registration - Restrictive per IP
  registration: createRateLimiter({
    name: 'registration',
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour per IP
    message: 'Too many registration attempts from this IP, please try again later',
    keyGenerator: (req) => req.ip // Always use IP for registration
  }),

  // API key generation - Very restrictive
  apiKey: createRateLimiter({
    name: 'api-key',
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 API key generations per day per user
    message: 'Too many API key generation requests, please try again tomorrow'
  })
};

/**
 * Dynamic rate limiter based on user tier
 */
const tieredRateLimiter = (baseLimits) => {
  return (req, res, next) => {
    // Get user tier
    const userTier = req.user?.subscription?.tier || 'free';
    
    // Define multipliers for different tiers
    const tierMultipliers = {
      free: 1,
      basic: 2,
      pro: 5,
      enterprise: 10
    };
    
    const multiplier = tierMultipliers[userTier] || 1;
    
    // Create rate limiter with adjusted limits
    const limiter = createRateLimiter({
      ...baseLimits,
      max: baseLimits.max * multiplier
    });
    
    return limiter(req, res, next);
  };
};

/**
 * Burst rate limiter - Allows bursts but limits sustained high traffic
 */
const burstRateLimiter = createRateLimiter({
  name: 'burst',
  windowMs: 1 * 1000, // 1 second
  max: 10, // 10 requests per second burst
  message: 'Request burst detected, please slow down',
  standardHeaders: false,
  legacyHeaders: false
});

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (req) => {
  // Skip for internal API calls
  if (req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY) {
    return true;
  }
  
  // Skip for admin users
  if (req.user?.role === 'admin') {
    return true;
  }
  
  // Skip for whitelisted IPs
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
  if (whitelistedIPs.includes(req.ip)) {
    return true;
  }
  
  return false;
};

/**
 * Apply rate limiting with skip conditions
 */
const applyRateLimit = (limiter) => {
  return (req, res, next) => {
    if (skipRateLimit(req)) {
      return next();
    }
    return limiter(req, res, next);
  };
};

/**
 * Rate limit info endpoint - Shows current limits for user
 */
const rateLimitInfo = async (req, res) => {
  try {
    const userId = req.user?.id || req.ip;
    const limits = {};
    
    // Get current limit status for each endpoint type
    for (const [name, limiter] of Object.entries(rateLimiters)) {
      const key = `rate-limit:${name}:${userId}`;
      const current = await redisClient.get(key);
      
      limits[name] = {
        limit: limiter.max,
        window: `${limiter.windowMs / 1000} seconds`,
        remaining: current ? limiter.max - parseInt(current) : limiter.max,
        resetAt: new Date(Date.now() + limiter.windowMs).toISOString()
      };
    }
    
    res.json({
      success: true,
      limits,
      tier: req.user?.subscription?.tier || 'free'
    });
  } catch (error) {
    logger.error('Failed to get rate limit info', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rate limit information'
    });
  }
};

module.exports = {
  rateLimiters,
  tieredRateLimiter,
  burstRateLimiter,
  applyRateLimit,
  rateLimitInfo,
  createRateLimiter
};