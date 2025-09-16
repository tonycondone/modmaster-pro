const app = require("./app-enhanced");
const config = require("./config");
const logger = require("./utils/logger");
const { db, runMigrations } = require("./models");

const PORT = config.app.port || 3000;
const HOST = config.app.host || "0.0.0.0";

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await db.raw("SELECT 1");
    logger.info("Database connection established");

    // Run migrations
    await runMigrations();
    logger.info("Database migrations completed");

    // Start HTTP server
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 ModMaster Pro Enhanced API Server started successfully!`);
      logger.info(`📍 Environment: ${config.app.environment}`);
      logger.info(`🌐 Server: http://${HOST}:${PORT}`);
      logger.info(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
      logger.info(`🔐 Auth Endpoints: http://${HOST}:${PORT}/api/v1/auth/`);
      logger.info(`🚗 Vehicle Endpoints: http://${HOST}:${PORT}/api/v1/vehicles`);
      logger.info(`📸 Scan Endpoints: http://${HOST}:${PORT}/api/v1/scans`);
      logger.info(`🔧 Parts Endpoints: http://${HOST}:${PORT}/api/v1/parts`);
      logger.info(`⏰ Started at: ${new Date().toISOString()}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Start the server
startServer();
