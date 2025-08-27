const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vehicle = sequelize.define('Vehicle', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    vin: {
      type: DataTypes.STRING(17),
      unique: true,
      validate: {
        len: [17, 17],
        is: /^[A-HJ-NPR-Z0-9]{17}$/
      }
    },
    make: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1900,
        max: new Date().getFullYear() + 1
      }
    },
    trim: {
      type: DataTypes.STRING
    },
    engineType: {
      type: DataTypes.STRING,
      field: 'engine_type'
    },
    engineDisplacement: {
      type: DataTypes.FLOAT,
      field: 'engine_displacement'
    },
    transmission: {
      type: DataTypes.STRING
    },
    drivetrain: {
      type: DataTypes.ENUM('FWD', 'RWD', 'AWD', '4WD')
    },
    bodyStyle: {
      type: DataTypes.STRING,
      field: 'body_style'
    },
    exteriorColor: {
      type: DataTypes.STRING,
      field: 'exterior_color'
    },
    interiorColor: {
      type: DataTypes.STRING,
      field: 'interior_color'
    },
    mileage: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0
      }
    },
    licensePlate: {
      type: DataTypes.STRING,
      field: 'license_plate'
    },
    nickname: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    images: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    specifications: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    modifications: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    maintenanceHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'maintenance_history'
    },
    purchaseDate: {
      type: DataTypes.DATE,
      field: 'purchase_date'
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'purchase_price'
    },
    currentValue: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'current_value'
    },
    totalInvested: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_invested'
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_primary'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_public'
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'views_count'
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'likes_count'
    },
    performanceData: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: 'performance_data'
    }
  }, {
    tableName: 'vehicles',
    underscored: true,
    timestamps: true
  });

  // Instance methods
  Vehicle.prototype.addModification = async function(modification) {
    const mods = this.modifications || [];
    mods.push({
      ...modification,
      addedAt: new Date()
    });
    this.modifications = mods;
    
    if (modification.cost) {
      this.totalInvested = (parseFloat(this.totalInvested) || 0) + parseFloat(modification.cost);
    }
    
    await this.save();
  };

  Vehicle.prototype.addMaintenanceRecord = async function(record) {
    const history = this.maintenanceHistory || [];
    history.push({
      ...record,
      recordedAt: new Date()
    });
    this.maintenanceHistory = history;
    
    if (record.mileage && record.mileage > this.mileage) {
      this.mileage = record.mileage;
    }
    
    await this.save();
  };

  Vehicle.prototype.incrementViews = async function() {
    this.viewsCount = (this.viewsCount || 0) + 1;
    await this.save();
  };

  return Vehicle;
};