const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const scraperRoutes = require('./routes/scraper');
const priceRoutes = require('./routes/prices');
const { initializeQueue } = require('./services/queueService');
const { initializeScheduler } = require('./services/scheduler');
const { connectRedis } = require('./utils/redis');
const { connectDatabase } = require('./utils/database');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/scrape', scraperRoutes);
app.use('/api/v1/prices', priceRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ModMaster Pro Scraping Service',
    version: '1.0.0',
    status: 'operational',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectRedis();
    await connectDatabase();
    
    // Initialize services
    await initializeQueue();
    await initializeScheduler();
    
    // Start listening
    const port = config.port || 8002;
    app.listen(port, () => {
      logger.info(`Scraping service listening on port ${port}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();