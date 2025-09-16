const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recommendation = sequelize.define('Recommendation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'vehicles',
        key: 'id'
      }
    },
    partId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      }
    },
    recommendationType: {
      type: DataTypes.ENUM(
        'maintenance', 'upgrade', 'replacement', 'compatibility', 
        'performance', 'cosmetic', 'safety', 'fuel_economy'
      ),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    benefits: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    estimatedTime: {
      type: DataTypes.INTEGER, // in hours
      allowNull: true
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
      allowNull: true
    },
    toolsRequired: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    prerequisites: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    relatedParts: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    alternativeParts: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    userFeedback: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    isAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dismissedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dismissReason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'recommendations',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['vehicleId']
      },
      {
        fields: ['partId']
      },
      {
        fields: ['recommendationType']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['confidence']
      },
      {
        fields: ['isAccepted']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return Recommendation;
};