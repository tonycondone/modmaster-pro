const { DataTypes } = require('sequelize');
const { hashPassword } = require('../middleware/auth');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 30]
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      field: 'last_name'
    },
    profilePicture: {
      type: DataTypes.STRING,
      field: 'profile_picture'
    },
    bio: {
      type: DataTypes.TEXT
    },
    location: {
      type: DataTypes.STRING
    },
    role: {
      type: DataTypes.ENUM('user', 'pro', 'shop', 'admin'),
      defaultValue: 'user'
    },
    subscriptionTier: {
      type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
      defaultValue: 'free',
      field: 'subscription_tier'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    verificationToken: {
      type: DataTypes.STRING,
      field: 'verification_token'
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      field: 'reset_password_token'
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      field: 'reset_password_expires'
    },
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login'
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        totalScans: 0,
        totalProjects: 0,
        totalVehicles: 0,
        reputation: 0
      }
    }
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await hashPassword(user.password);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await hashPassword(user.password);
        }
      }
    }
  });

  // Instance methods
  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    delete values.verificationToken;
    delete values.resetPasswordToken;
    delete values.resetPasswordExpires;
    return values;
  };

  User.prototype.updateStats = async function(field, increment = 1) {
    const stats = this.stats || {};
    stats[field] = (stats[field] || 0) + increment;
    this.stats = stats;
    await this.save();
  };

  return User;
};