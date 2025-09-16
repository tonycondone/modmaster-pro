const app = require("./src/app-minimal");
const config = require("./src/config");
const logger = require("./src/utils/logger");

const PORT = config.app.port || 3000;
const HOST = config.app.host || "0.0.0.0";

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`🚀 ModMaster Pro Backend API started successfully!`);
  logger.info(`📍 Environment: ${config.app.environment}`);
  logger.info(`🌐 Server: http://${HOST}:${PORT}`);
  logger.info(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
  logger.info(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});
