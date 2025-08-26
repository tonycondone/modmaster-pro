const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../utils/logger');
const database = require('../utils/database');
const redis = require('../utils/redis');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the application and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *       503:
 *         description: Application is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: config.app.version,
    environment: config.app.environment,
    dependencies: {},
    checks: [],
  };

  let hasErrors = false;

  try {
    // Check database health
    const dbStartTime = Date.now();
    try {
      await database.testConnection();
      const dbResponseTime = Date.now() - dbStartTime;
      healthCheck.dependencies.database = {
        status: 'healthy',
        responseTime: dbResponseTime,
        timestamp: new Date().toISOString(),
      };
      healthCheck.checks.push({
        name: 'database',
        status: 'healthy',
        responseTime: dbResponseTime,
      });
    } catch (error) {
      const dbResponseTime = Date.now() - dbStartTime;
      healthCheck.dependencies.database = {
        status: 'unhealthy',
        error: error.message,
        responseTime: dbResponseTime,
        timestamp: new Date().toISOString(),
      };
      healthCheck.checks.push({
        name: 'database',
        status: 'unhealthy',
        error: error.message,
        responseTime: dbResponseTime,
      });
      hasErrors = true;
    }

    // Check Redis health
    const redisStartTime = Date.now();
    try {
      await redis.testConnection();
      const redisResponseTime = Date.now() - redisStartTime;
      healthCheck.dependencies.redis = {
        status: 'healthy',
        responseTime: redisResponseTime,
        timestamp: new Date().toISOString(),
      };
      healthCheck.checks.push({
        name: 'redis',
        status: 'healthy',
        responseTime: redisResponseTime,
      });
    } catch (error) {
      const redisResponseTime = Date.now() - redisStartTime;
      healthCheck.dependencies.redis = {
        status: 'unhealthy',
        error: error.message,
        responseTime: redisResponseTime,
        timestamp: new Date().toISOString(),
      };
      healthCheck.checks.push({
        name: 'redis',
        status: 'unhealthy',
        error: error.message,
        responseTime: redisResponseTime,
      });
      hasErrors = true;
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    healthCheck.system = {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    };

    // Check external services if configured
    if (config.external.aiService.url) {
      const aiStartTime = Date.now();
      try {
        // Simple ping to AI service
        const response = await fetch(`${config.external.aiService.url}/health`, {
          method: 'GET',
          timeout: 5000,
        });
        const aiResponseTime = Date.now() - aiStartTime;
        
        if (response.ok) {
          healthCheck.dependencies.aiService = {
            status: 'healthy',
            responseTime: aiResponseTime,
            timestamp: new Date().toISOString(),
          };
          healthCheck.checks.push({
            name: 'aiService',
            status: 'healthy',
            responseTime: aiResponseTime,
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        const aiResponseTime = Date.now() - aiStartTime;
        healthCheck.dependencies.aiService = {
          status: 'unhealthy',
          error: error.message,
          responseTime: aiResponseTime,
          timestamp: new Date().toISOString(),
        };
        healthCheck.checks.push({
          name: 'aiService',
          status: 'unhealthy',
          error: error.message,
          responseTime: aiResponseTime,
        });
        hasErrors = true;
      }
    }

    // Check scraping service if configured
    if (config.external.scrapingService.url) {
      const scrapingStartTime = Date.now();
      try {
        // Simple ping to scraping service
        const response = await fetch(`${config.external.scrapingService.url}/health`, {
          method: 'GET',
          timeout: 5000,
        });
        const scrapingResponseTime = Date.now() - scrapingStartTime;
        
        if (response.ok) {
          healthCheck.dependencies.scrapingService = {
            status: 'healthy',
            responseTime: scrapingResponseTime,
            timestamp: new Date().toISOString(),
          };
          healthCheck.checks.push({
            name: 'scrapingService',
            status: 'healthy',
            responseTime: scrapingResponseTime,
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        const scrapingResponseTime = Date.now() - scrapingStartTime;
        healthCheck.dependencies.scrapingService = {
          status: 'unhealthy',
          error: error.message,
          responseTime: scrapingResponseTime,
          timestamp: new Date().toISOString(),
        };
        healthCheck.checks.push({
          name: 'scrapingService',
          status: 'unhealthy',
          error: error.message,
          responseTime: scrapingResponseTime,
        });
        hasErrors = true;
      }
    }

    // Set overall status
    if (hasErrors) {
      healthCheck.status = 'unhealthy';
    }

    // Calculate total response time
    const totalResponseTime = Date.now() - startTime;
    healthCheck.responseTime = totalResponseTime;

    // Log health check
    logger.info('Health check completed', {
      status: healthCheck.status,
      responseTime: totalResponseTime,
      checks: healthCheck.checks.length,
      errors: healthCheck.checks.filter(check => check.status === 'unhealthy').length,
    });

    // Return appropriate status code
    const statusCode = hasErrors ? 503 : 200;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Health check failed:', error);
    
    healthCheck.status = 'unhealthy';
    healthCheck.error = error.message;
    healthCheck.responseTime = Date.now() - startTime;
    
    res.status(503).json(healthCheck);
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check endpoint
 *     description: Returns whether the application is ready to receive traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await database.testConnection();
    await redis.testConnection();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check endpoint
 *     description: Returns whether the application is alive and running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;