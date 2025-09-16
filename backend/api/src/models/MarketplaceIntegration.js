const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MarketplaceIntegration = sequelize.define('MarketplaceIntegration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    partId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      }
    },
    platform: {
      type: DataTypes.ENUM(
        'amazon', 'ebay', 'autozone', 'summit_racing', 'jegs', 
        'advance_auto', 'oreilly', 'tire_rack', 'rock_auto',
        'walmart', 'best_buy', 'fcpeuro', 'ecs_tuning'
      ),
      allowNull: false
    },
    externalId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    externalUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    currentPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    discountPercentage: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    availability: {
      type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued'),
      defaultValue: 'in_stock'
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    shippingTime: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sellerRating: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    sellerName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    primeEligible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    freeShipping: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    returnPolicy: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    warrantyInfo: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    customerReviewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    averageRating: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    priceHistory: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    dealAlertThreshold: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    isTracked: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checkFrequencyHours: {
      type: DataTypes.INTEGER,
      defaultValue: 6
    },
    additionalData: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'marketplace_integrations',
    timestamps: true,
    indexes: [
      {
        fields: ['partId']
      },
      {
        fields: ['platform']
      },
      {
        fields: ['externalId']
      },
      {
        fields: ['partId', 'platform']
      },
      {
        fields: ['currentPrice']
      },
      {
        fields: ['availability']
      },
      {
        fields: ['lastCheckedAt']
      },
      {
        fields: ['isTracked']
      }
    ]
  });

  return MarketplaceIntegration;
};