const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const database = require('./utils/database');
const redis = require('./utils/redis');

// Create HTTP server
const server = require('http').createServer(app);

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error during server close:', err);
      process.exit(1);
    }
    
    logger.info('HTTP server closed');
    
    // Close database connections
    database.close()
      .then(() => {
        logger.info('Database connections closed');
        return redis.close();
      })
      .then(() => {
        logger.info('Redis connections closed');
        logger.info('Graceful shutdown completed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await database.testConnection();
    logger.info('Database connection established');
    
    // Test Redis connection
    await redis.testConnection();
    logger.info('Redis connection established');
    
    // Start HTTP server
    server.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 ModMaster Pro API Server started successfully!`);
      logger.info(`📍 Environment: ${config.app.environment}`);
      logger.info(`🌐 Server: http://${config.app.host}:${config.app.port}`);
      logger.info(`📚 API Documentation: http://${config.app.host}:${config.app.port}/api-docs`);
      logger.info(`📊 Health Check: http://${config.app.host}:${config.app.port}/health`);
      logger.info(`📈 Metrics: http://${config.app.host}:${config.app.port}/metrics`);
      logger.info(`⏰ Started at: ${new Date().toISOString()}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = `${config.app.host}:${config.app.port}`;
      
      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${config.app.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${config.app.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle server close event
server.on('close', () => {
  logger.info('HTTP server closed');
});

// Start the server
startServer();

module.exports = server;