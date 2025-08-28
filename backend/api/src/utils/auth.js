const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('./logger');

/**
 * Generate JWT tokens (access and refresh)
 * @param {Object} payload - Token payload
 * @returns {Object} Access and refresh tokens
 */
const generateTokens = (payload) => {
  try {
    const accessToken = jwt.sign(
      payload,
      config.auth.jwtSecret,
      {
        expiresIn: config.auth.jwtExpire,
        issuer: config.app.name,
        audience: config.app.baseUrl
      }
    );

    const refreshToken = jwt.sign(
      payload,
      config.auth.jwtRefreshSecret,
      {
        expiresIn: config.auth.jwtRefreshExpire,
        issuer: config.app.name,
        audience: config.app.baseUrl
      }
    );

    return {
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error('Error generating tokens', { error: error.message });
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {boolean} isRefreshToken - Whether this is a refresh token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken ? config.auth.jwtRefreshSecret : config.auth.jwtSecret;
    
    return jwt.verify(token, secret, {
      issuer: config.app.name,
      audience: config.app.baseUrl
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (refreshToken) => {
  return verifyToken(refreshToken, true);
};

/**
 * Hash password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = config.auth.bcryptRounds || 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} Whether password matches
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate random token
 * @param {number} length - Token length in bytes
 * @returns {string} Random token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate secure verification code
 * @param {number} length - Code length
 * @returns {string} Numeric code
 */
const generateVerificationCode = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Extract bearer token from authorization header
 * @param {string} authHeader - Authorization header
 * @returns {string|null} Token or null
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Create password reset token
 * @returns {Object} Token and expiry
 */
const createPasswordResetToken = () => {
  const token = generateRandomToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour expiry
  
  return {
    token,
    expiry
  };
};

/**
 * Create email verification token
 * @returns {Object} Token and expiry
 */
const createEmailVerificationToken = () => {
  const token = generateRandomToken();
  const code = generateVerificationCode();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hour expiry
  
  return {
    token,
    code,
    expiry
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
  const minLength = config.auth.passwordMinLength || 8;
  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (config.auth.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.auth.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.auth.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.auth.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate API key
 * @param {string} prefix - Key prefix
 * @returns {string} API key
 */
const generateApiKey = (prefix = 'mm') => {
  const key = generateRandomToken(32);
  return `${prefix}_${key}`;
};

/**
 * Hash API key for storage
 * @param {string} apiKey - API key
 * @returns {string} Hashed key
 */
const hashApiKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

module.exports = {
  generateTokens,
  verifyToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateRandomToken,
  generateVerificationCode,
  extractBearerToken,
  createPasswordResetToken,
  createEmailVerificationToken,
  validatePasswordStrength,
  generateApiKey,
  hashApiKey
};