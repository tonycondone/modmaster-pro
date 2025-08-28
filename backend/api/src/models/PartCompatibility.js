const { DataTypes } = require('sequelize');
const sequelize = require('../database');

/**
 * PartCompatibility model for tracking which parts work with which vehicles
 */
const PartCompatibility = sequelize.define('PartCompatibility', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  partId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'parts',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  make: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  yearStart: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 1
    }
  },
  yearEnd: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 1,
      isGreaterThanStart(value) {
        if (value < this.yearStart) {
          throw new Error('Year end must be greater than or equal to year start');
        }
      }
    }
  },
  engine: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Specific engine requirement (e.g., "2.5L", "V6")'
  },
  trim: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Specific trim level requirement'
  },
  universal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this part is universal (fits all vehicles)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional compatibility notes or restrictions'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this compatibility has been verified'
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'part_compatibilities',
  timestamps: true,
  indexes: [
    {
      fields: ['partId']
    },
    {
      fields: ['make', 'model']
    },
    {
      fields: ['yearStart', 'yearEnd']
    },
    {
      fields: ['engine']
    },
    {
      fields: ['trim']
    },
    {
      fields: ['universal']
    },
    {
      fields: ['verified']
    }
  ]
});

// Class methods
PartCompatibility.findCompatibleParts = async function(vehicleInfo) {
  const { make, model, year, engine, trim } = vehicleInfo;
  
  const whereClause = {
    [sequelize.Sequelize.Op.or]: [
      {
        universal: true
      },
      {
        make,
        model,
        yearStart: { [sequelize.Sequelize.Op.lte]: year },
        yearEnd: { [sequelize.Sequelize.Op.gte]: year }
      }
    ]
  };
  
  // Add optional filters
  if (engine) {
    whereClause[sequelize.Sequelize.Op.or][1].engine = {
      [sequelize.Sequelize.Op.or]: [engine, null]
    };
  }
  
  if (trim) {
    whereClause[sequelize.Sequelize.Op.or][1].trim = {
      [sequelize.Sequelize.Op.or]: [trim, null]
    };
  }
  
  return await this.findAll({
    where: whereClause,
    include: [{
      model: sequelize.models.Part,
      as: 'part'
    }]
  });
};

PartCompatibility.checkCompatibility = async function(partId, vehicleInfo) {
  const { make, model, year, engine, trim } = vehicleInfo;
  
  const compatibility = await this.findOne({
    where: {
      partId,
      [sequelize.Sequelize.Op.or]: [
        {
          universal: true
        },
        {
          make,
          model,
          yearStart: { [sequelize.Sequelize.Op.lte]: year },
          yearEnd: { [sequelize.Sequelize.Op.gte]: year },
          [sequelize.Sequelize.Op.or]: [
            { engine: null },
            { engine }
          ],
          [sequelize.Sequelize.Op.or]: [
            { trim: null },
            { trim }
          ]
        }
      ]
    }
  });
  
  return compatibility !== null;
};

PartCompatibility.bulkCreateCompatibilities = async function(partId, compatibilities) {
  const records = compatibilities.map(comp => ({
    partId,
    ...comp
  }));
  
  return await this.bulkCreate(records, {
    validate: true,
    returning: true
  });
};

// Instance methods
PartCompatibility.prototype.verify = async function(userId) {
  this.verified = true;
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  return await this.save();
};

PartCompatibility.prototype.isCompatibleWithVehicle = function(vehicle) {
  if (this.universal) return true;
  
  if (this.make !== vehicle.make || this.model !== vehicle.model) {
    return false;
  }
  
  if (vehicle.year < this.yearStart || vehicle.year > this.yearEnd) {
    return false;
  }
  
  if (this.engine && vehicle.engine && this.engine !== vehicle.engine) {
    return false;
  }
  
  if (this.trim && vehicle.trim && this.trim !== vehicle.trim) {
    return false;
  }
  
  return true;
};

module.exports = PartCompatibility;