const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate access and refresh tokens
 */
function generateTokens(user, rememberMe = false) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(
    payload,
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiry }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.auth.refreshTokenSecret,
    { 
      expiresIn: rememberMe ? config.auth.refreshTokenExpiryLong : config.auth.refreshTokenExpiry 
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: config.auth.jwtExpiry
  };
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.auth.refreshTokenSecret);
  } catch (error) {
    throw error;
  }
}

/**
 * Generate random token
 */
function generateRandomToken(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password
 */
async function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

/**
 * Compare password
 */
async function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hash);
}

module.exports = {
  generateTokens,
  verifyRefreshToken,
  generateRandomToken,
  hashPassword,
  comparePassword
};