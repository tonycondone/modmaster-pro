const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Scan = sequelize.define('Scan', {
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
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Vehicles',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    imagePublicId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('processing', 'completed', 'failed'),
      defaultValue: 'processing'
    },
    results: {
      type: DataTypes.JSON,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processingStartedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    processingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'scans',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['vehicleId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance methods
  Scan.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
  };

  // Static methods
  Scan.findByUserId = async function(filters, options = {}) {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = options;
    const offset = (page - 1) * limit;

    const whereClause = { userId: filters.userId };
    if (filters.status) whereClause.status = filters.status;
    if (filters.vehicleId) whereClause.vehicleId = filters.vehicleId;

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: sequelize.models.Vehicle,
          as: 'vehicle',
          attributes: ['id', 'make', 'model', 'year']
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

  Scan.updateResults = async function(scanId, updateData) {
    const [updatedRowsCount] = await this.update(updateData, {
      where: { id: scanId }
    });

    if (updatedRowsCount === 0) {
      throw new Error('Scan not found');
    }

    return this.findByPk(scanId);
  };

  Scan.updateNotes = async function(scanId, notes) {
    const [updatedRowsCount] = await this.update(
      { notes },
      { where: { id: scanId } }
    );

    if (updatedRowsCount === 0) {
      throw new Error('Scan not found');
    }

    return this.findByPk(scanId);
  };

  Scan.getUserStats = async function(userId) {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_scans,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_scans,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_scans,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as scans_today,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as scans_this_week,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as scans_this_month
      FROM scans 
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    return stats[0] || {};
  };

  return Scan;
};