const { db } = require('../utils/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { ValidationError } = require('../middleware/errorHandler');

class User {
  static tableName = 'users';

  // Find user by ID
  static async findById(id) {
    return db(this.tableName)
      .where({ id })
      .first();
  }

  // Find user by email
  static async findByEmail(email) {
    return db(this.tableName)
      .where({ email: email.toLowerCase() })
      .first();
  }

  // Find user by username
  static async findByUsername(username) {
    return db(this.tableName)
      .where({ username: username.toLowerCase() })
      .first();
  }

  // Create new user
  static async create(userData) {
    const {
      email,
      username,
      password,
      first_name,
      last_name,
      phone,
      preferences = {},
    } = userData;

    // Check if email already exists
    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new ValidationError('Email already exists');
    }

    // Check if username already exists
    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      throw new ValidationError('Username already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, config.password.bcryptRounds);

    // Generate verification token
    const verification_token = uuidv4();

    // Create user
    const [user] = await db(this.tableName)
      .insert({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password_hash,
        first_name,
        last_name,
        phone,
        preferences,
        verification_token,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Remove sensitive data
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_password_token;
    delete user.two_factor_secret;

    return user;
  }

  // Update user
  static async update(id, updateData) {
    // Remove fields that shouldn't be updated directly
    const {
      id: _,
      email,
      username,
      password,
      password_hash,
      verification_token,
      reset_password_token,
      two_factor_secret,
      created_at,
      ...safeUpdateData
    } = updateData;

    // If updating email, check uniqueness
    if (email) {
      const existing = await db(this.tableName)
        .where({ email: email.toLowerCase() })
        .whereNot({ id })
        .first();
      
      if (existing) {
        throw new ValidationError('Email already exists');
      }
      
      safeUpdateData.email = email.toLowerCase();
      safeUpdateData.is_verified = false;
      safeUpdateData.verification_token = uuidv4();
    }

    // If updating username, check uniqueness
    if (username) {
      const existing = await db(this.tableName)
        .where({ username: username.toLowerCase() })
        .whereNot({ id })
        .first();
      
      if (existing) {
        throw new ValidationError('Username already exists');
      }
      
      safeUpdateData.username = username.toLowerCase();
    }

    // If updating password, hash it
    if (password) {
      safeUpdateData.password_hash = await bcrypt.hash(password, config.password.bcryptRounds);
    }

    // Update user
    const [user] = await db(this.tableName)
      .where({ id })
      .update({
        ...safeUpdateData,
        updated_at: new Date(),
      })
      .returning('*');

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Remove sensitive data
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_password_token;
    delete user.two_factor_secret;

    return user;
  }

  // Delete user (soft delete)
  static async delete(id) {
    const [user] = await db(this.tableName)
      .where({ id })
      .update({
        is_active: false,
        updated_at: new Date(),
      })
      .returning('*');

    if (!user) {
      throw new ValidationError('User not found');
    }

    return { success: true };
  }

  // Verify email
  static async verifyEmail(token) {
    const [user] = await db(this.tableName)
      .where({ verification_token: token })
      .update({
        is_verified: true,
        verification_token: null,
        verified_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    if (!user) {
      throw new ValidationError('Invalid verification token');
    }

    return user;
  }

  // Request password reset
  static async requestPasswordReset(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    const reset_password_token = uuidv4();
    const reset_password_expires_at = new Date();
    reset_password_expires_at.setHours(reset_password_expires_at.getHours() + 1);

    await db(this.tableName)
      .where({ id: user.id })
      .update({
        reset_password_token,
        reset_password_expires_at,
        updated_at: new Date(),
      });

    return {
      success: true,
      token: reset_password_token,
      email: user.email,
    };
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    const user = await db(this.tableName)
      .where({ reset_password_token: token })
      .where('reset_password_expires_at', '>', new Date())
      .first();

    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const password_hash = await bcrypt.hash(newPassword, config.password.bcryptRounds);

    const [updatedUser] = await db(this.tableName)
      .where({ id: user.id })
      .update({
        password_hash,
        reset_password_token: null,
        reset_password_expires_at: null,
        updated_at: new Date(),
      })
      .returning('*');

    delete updatedUser.password_hash;
    delete updatedUser.verification_token;
    delete updatedUser.reset_password_token;
    delete updatedUser.two_factor_secret;

    return updatedUser;
  }

  // Update last login
  static async updateLastLogin(id, ip) {
    await db(this.tableName)
      .where({ id })
      .update({
        last_login_at: new Date(),
        last_login_ip: ip,
        login_attempts: 0,
        updated_at: new Date(),
      });
  }

  // Get user statistics
  static async getStats(userId) {
    const stats = await db.raw(`
      SELECT 
        u.id,
        u.created_at as member_since,
        u.subscription_tier,
        COUNT(DISTINCT v.id) as vehicles_count,
        COUNT(DISTINCT vs.id) as scans_count,
        COUNT(DISTINCT mp.id) as projects_count,
        COUNT(DISTINCT r.id) as reviews_count,
        COALESCE(SUM(mp.actual_cost), 0) as total_spent
      FROM users u
      LEFT JOIN vehicles v ON v.user_id = u.id
      LEFT JOIN vehicle_scans vs ON vs.user_id = u.id
      LEFT JOIN modification_projects mp ON mp.user_id = u.id AND mp.status = 'completed'
      LEFT JOIN reviews r ON r.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id, u.created_at, u.subscription_tier
    `, [userId]);

    return stats.rows[0] || null;
  }

  // Search users
  static async search(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at:desc',
      role,
      subscription_tier,
      is_active = true,
    } = options;

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(':');

    let dbQuery = db(this.tableName)
      .select(
        'id',
        'email',
        'username',
        'first_name',
        'last_name',
        'avatar_url',
        'role',
        'subscription_tier',
        'is_verified',
        'created_at'
      )
      .where({ is_active });

    // Apply filters
    if (query) {
      dbQuery = dbQuery.where(function() {
        this.where('email', 'ilike', `%${query}%`)
          .orWhere('username', 'ilike', `%${query}%`)
          .orWhere('first_name', 'ilike', `%${query}%`)
          .orWhere('last_name', 'ilike', `%${query}%`);
      });
    }

    if (role) {
      dbQuery = dbQuery.where({ role });
    }

    if (subscription_tier) {
      dbQuery = dbQuery.where({ subscription_tier });
    }

    // Get total count
    const totalQuery = dbQuery.clone();
    const [{ count }] = await totalQuery.count('* as count');

    // Get paginated results
    const users = await dbQuery
      .orderBy(sortField, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: users,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }
}

module.exports = User;