const express = require('express');
const router = express.Router();
const { redis } = require('../utils/redis');
const { query } = require('../utils/database');

router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'scraping-service',
    timestamp: new Date().toISOString(),
  });
});

router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check Redis
  try {
    await redis.ping();
    health.checks.redis = { status: 'healthy' };
  } catch (error) {
    health.checks.redis = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }

  // Check Database
  try {
    await query('SELECT 1');
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }

  // Check scrapers
  const scraperManager = require('../services/scraperManager');
  health.checks.scrapers = {
    status: 'healthy',
    platforms: Array.from(scraperManager.scrapers.keys()),
  };

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

module.exports = router;