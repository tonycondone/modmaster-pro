const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    orderNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'),
      defaultValue: 'pending'
    },
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: false
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: false
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['orderNumber'], unique: true },
      { fields: ['createdAt'] }
    ],
    hooks: {
      beforeCreate: async (order) => {
        // Generate order number
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        order.orderNumber = `MOD-${date}-${random}`;
      }
    }
  });

  // Instance methods
  Order.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
  };

  // Static methods
  Order.findByUserId = async function(filters, options = {}) {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = options;
    const offset = (page - 1) * limit;

    const whereClause = { userId: filters.userId };
    if (filters.status) whereClause.status = filters.status;

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  };

  Order.updateStatus = async function(orderId, status, metadata = {}) {
    const updateData = { status };
    
    // Set timestamp fields based on status
    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    if (Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    const [updatedRowsCount] = await this.update(updateData, {
      where: { id: orderId }
    });

    if (updatedRowsCount === 0) {
      throw new Error('Order not found');
    }

    return this.findByPk(orderId);
  };

  Order.getUserStats = async function(userId) {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        SUM(CASE WHEN status IN ('completed', 'delivered') THEN total_amount ELSE 0 END) as total_spent,
        AVG(CASE WHEN status IN ('completed', 'delivered') THEN total_amount ELSE NULL END) as average_order_value
      FROM orders 
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    return stats[0] || {};
  };

  return Order;
};