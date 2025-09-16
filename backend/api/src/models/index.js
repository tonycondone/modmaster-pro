const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Sequelize
const sequelize = new Sequelize(config.database.url, {
  logging: (msg) => logger.debug(msg),
  pool: {
    max: config.database.poolMax,
    min: config.database.poolMin,
    acquire: 30000,
    idle: 10000
  }
});

// Import models
const User = require('./User')(sequelize);
const Vehicle = require('./Vehicle')(sequelize);
const Part = require('./Part')(sequelize);
const Scan = require('./Scan')(sequelize);
const VehicleScan = require('./VehicleScan')(sequelize);
const Project = require('./Project')(sequelize);
const Review = require('./Review')(sequelize);
const MarketplaceIntegration = require('./MarketplaceIntegration')(sequelize);
const Recommendation = require('./Recommendation')(sequelize);
const Order = require('./Order')(sequelize);
const Payment = require('./Payment')(sequelize);
const Maintenance = require('./Maintenance')(sequelize);
const PartCompatibility = require('./PartCompatibility')(sequelize);

// Define associations
User.hasMany(Vehicle, { foreignKey: 'userId', as: 'vehicles' });
Vehicle.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(Scan, { foreignKey: 'userId', as: 'scans' });
Scan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Vehicle.hasMany(Scan, { foreignKey: 'vehicleId', as: 'scans' });
Scan.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

User.hasMany(Project, { foreignKey: 'userId', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Vehicle.hasMany(Project, { foreignKey: 'vehicleId', as: 'projects' });
Project.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

Part.hasMany(MarketplaceIntegration, { foreignKey: 'partId', as: 'marketplaceIntegrations' });
MarketplaceIntegration.belongsTo(Part, { foreignKey: 'partId', as: 'part' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Part.hasMany(Review, { foreignKey: 'partId', as: 'reviews' });
Review.belongsTo(Part, { foreignKey: 'partId', as: 'part' });

User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations' });
Recommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Vehicle.hasMany(Recommendation, { foreignKey: 'vehicleId', as: 'recommendations' });
Recommendation.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

// Database connection functions
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
};

const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    logger.info(`Database synced successfully ${force ? '(forced)' : ''}`);
  } catch (error) {
    logger.error('Database sync failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  User,
  Vehicle,
  Part,
  Scan,
  VehicleScan,
  Project,
  Review,
  MarketplaceIntegration,
  Recommendation,
  Order,
  Payment,
  Maintenance,
  PartCompatibility,
  connectDatabase,
  syncDatabase
};