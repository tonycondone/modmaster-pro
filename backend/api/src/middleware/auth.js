const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('../utils/logger');
const { db } = require('../utils/database');
const { cache } = require('../utils/redis');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  algorithms: [config.jwt.algorithm],
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:token:${payload.jti}`);
    if (isBlacklisted) {
      return done(null, false, { message: 'Token has been revoked' });
    }

    // Get user from cache or database
    const cacheKey = `user:${payload.sub}`;
    let user = await cache.get(cacheKey);

    if (!user) {
      user = await db('users')
        .where({ id: payload.sub, is_active: true })
        .first();

      if (user) {
        // Cache user for future requests
        await cache.set(cacheKey, user, config.performance.cache.userDataTtl);
      }
    }

    if (!user) {
      return done(null, false, { message: 'User not found' });
    }

    // Check if user is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return done(null, false, { message: 'Account is locked' });
    }

    // Remove sensitive data
    delete user.password_hash;
    delete user.two_factor_secret;
    delete user.verification_token;
    delete user.reset_password_token;

    return done(null, user);
  } catch (error) {
    logger.error('JWT strategy error:', error);
    return done(error);
  }
}));

// Local Strategy (for login)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {
  try {
    // Find user by email
    const user = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (!user) {
      return done(null, false, { message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
      return done(null, false, { 
        message: `Account is locked. Try again in ${remainingTime} minutes` 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Increment login attempts
      await db('users')
        .where({ id: user.id })
        .increment('login_attempts', 1);

      // Lock account after 5 failed attempts
      if (user.login_attempts >= 4) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        
        await db('users')
          .where({ id: user.id })
          .update({ locked_until: lockUntil });

        logger.logSecurity('account_locked', {
          userId: user.id,
          email: user.email,
          reason: 'max_login_attempts',
        });
      }

      return done(null, false, { message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.is_active) {
      return done(null, false, { message: 'Account is inactive' });
    }

    // Check if email is verified
    if (!user.is_verified) {
      return done(null, false, { message: 'Email not verified' });
    }

    // Reset login attempts on successful login
    await db('users')
      .where({ id: user.id })
      .update({
        login_attempts: 0,
        last_login_at: new Date(),
        last_login_ip: null, // Will be updated in login controller
      });

    // Remove sensitive data
    delete user.password_hash;
    delete user.two_factor_secret;
    delete user.verification_token;
    delete user.reset_password_token;

    return done(null, user);
  } catch (error) {
    logger.error('Local strategy error:', error);
    return done(error);
  }
}));

// Generate JWT token
const generateToken = (user, options = {}) => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    jti: require('uuid').v4(), // Unique token ID for blacklisting
  };

  const tokenOptions = {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithm: config.jwt.algorithm,
    ...options,
  };

  return jwt.sign(payload, config.jwt.secret, tokenOptions);
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return generateToken(user, { 
    expiresIn: config.jwt.refreshExpiresIn 
  });
};

// Verify token
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithms: [config.jwt.algorithm],
  });
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      const message = info?.message || 'Authentication required';
      return next(new AuthenticationError(message));
    }

    req.user = user;
    next();
  })(req, res, next);
};

// Middleware to require specific role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      logger.logSecurity('unauthorized_access_attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
      });
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

// Middleware for optional authentication
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Middleware to check subscription tier
const requireSubscription = (...tiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!tiers.includes(req.user.subscription_tier)) {
      // Check if subscription has expired
      if (req.user.subscription_expires_at && 
          new Date(req.user.subscription_expires_at) < new Date()) {
        return next(new AuthorizationError('Subscription has expired'));
      }
      
      return next(new AuthorizationError(
        `This feature requires ${tiers.join(' or ')} subscription`
      ));
    }

    next();
  };
};

// Middleware for rate limiting based on user tier
const tierBasedRateLimit = (baseLimit = 100) => {
  const tierMultipliers = {
    free: 1,
    basic: 2,
    pro: 5,
    shop: 10,
  };

  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const multiplier = tierMultipliers[req.user.subscription_tier] || 1;
    const limit = baseLimit * multiplier;
    
    // Store limit in request for rate limiter
    req.rateLimit = {
      max: limit,
      windowMs: config.rateLimit.windowMs,
    };

    next();
  };
};

// Initialize passport
const initializePassport = (app) => {
  app.use(passport.initialize());
};

module.exports = {
  initializePassport,
  requireAuth,
  requireRole,
  optionalAuth,
  requireSubscription,
  tierBasedRateLimit,
  generateToken,
  generateRefreshToken,
  verifyToken,
  passport,
};