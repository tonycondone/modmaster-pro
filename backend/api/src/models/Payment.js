const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    processorResponse: {
      type: DataTypes.JSON,
      allowNull: true
    },
    failureReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['userId'] },
      { fields: ['stripePaymentIntentId'], unique: true },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance methods
  Payment.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
  };

  // Static methods
  Payment.findByOrderId = async function(orderId) {
    return this.findOne({
      where: { orderId },
      include: [
        {
          model: sequelize.models.Order,
          as: 'order'
        }
      ]
    });
  };

  Payment.updateStatus = async function(paymentIntentId, status, metadata = {}) {
    const updateData = { status };
    
    if (Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    const [updatedRowsCount] = await this.update(updateData, {
      where: { stripePaymentIntentId: paymentIntentId }
    });

    if (updatedRowsCount === 0) {
      throw new Error('Payment not found');
    }

    return this.findOne({ where: { stripePaymentIntentId: paymentIntentId } });
  };

  Payment.createRefund = async function(refundData) {
    const Refund = sequelize.models.Refund;
    return Refund.create(refundData);
  };

  return Payment;
};

// Create Refund model as well
const createRefundModel = (sequelize) => {
  const Refund = sequelize.define('Refund', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id'
      }
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Payments',
        key: 'id'
      }
    },
    stripeRefundId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'succeeded', 'failed'),
      defaultValue: 'pending'
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'refunds',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['paymentId'] },
      { fields: ['stripeRefundId'], unique: true },
      { fields: ['status'] }
    ]
  });

  return Refund;
};