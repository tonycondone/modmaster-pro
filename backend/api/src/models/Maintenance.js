const { DataTypes } = require('sequelize');
const sequelize = require('../database');

/**
 * Maintenance model for tracking vehicle maintenance records
 */
const Maintenance = sequelize.define('Maintenance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vehicles',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM(
      'Oil Change',
      'Tire Rotation',
      'Brake Service',
      'Air Filter',
      'Transmission Service',
      'Coolant Flush',
      'Battery Replacement',
      'Spark Plugs',
      'Wheel Alignment',
      'Other'
    ),
    allowNull: false
  },
  serviceDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  mileage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 999999
    }
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  serviceProvider: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Service provider details: name, address, phone'
  },
  parts: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of parts used: name, partNumber, cost'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment URLs (receipts, photos)'
  },
  nextServiceDue: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Next service due: date, mileage'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'maintenance',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['vehicleId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['serviceDate']
    },
    {
      fields: ['mileage']
    },
    {
      fields: ['reminderSent']
    }
  ]
});

// Class methods
Maintenance.getUpcomingMaintenance = async function(vehicleId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await this.findAll({
    where: {
      vehicleId,
      reminderSent: false,
      nextServiceDue: {
        date: {
          [sequelize.Sequelize.Op.lte]: futureDate
        }
      }
    },
    order: [['nextServiceDue.date', 'ASC']]
  });
};

Maintenance.getOverdueMaintenance = async function(vehicleId) {
  return await this.findAll({
    where: {
      vehicleId,
      nextServiceDue: {
        date: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    },
    order: [['nextServiceDue.date', 'ASC']]
  });
};

Maintenance.getMaintenanceHistory = async function(vehicleId, limit = 10) {
  return await this.findAll({
    where: { vehicleId },
    order: [['serviceDate', 'DESC']],
    limit
  });
};

Maintenance.getMaintenanceCosts = async function(vehicleId, startDate, endDate) {
  const result = await this.findOne({
    where: {
      vehicleId,
      serviceDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [sequelize.Sequelize.fn('SUM', sequelize.Sequelize.col('cost')), 'totalCost'],
      [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'serviceCount']
    ],
    raw: true
  });
  
  return {
    totalCost: parseFloat(result.totalCost) || 0,
    serviceCount: parseInt(result.serviceCount) || 0
  };
};

// Instance methods
Maintenance.prototype.isOverdue = function() {
  if (!this.nextServiceDue?.date) return false;
  return new Date(this.nextServiceDue.date) < new Date();
};

Maintenance.prototype.markReminderSent = async function() {
  this.reminderSent = true;
  this.reminderSentAt = new Date();
  return await this.save();
};

Maintenance.prototype.calculateNextServiceDate = function(monthsInterval) {
  const nextDate = new Date(this.serviceDate);
  nextDate.setMonth(nextDate.getMonth() + monthsInterval);
  return nextDate;
};

Maintenance.prototype.calculateNextServiceMileage = function(mileageInterval) {
  return this.mileage + mileageInterval;
};

module.exports = Maintenance;