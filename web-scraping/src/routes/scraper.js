const express = require('express');
const router = express.Router();
const scraperManager = require('../services/scraperManager');
const { validateScrapeRequest } = require('../middleware/validation');
const logger = require('../utils/logger');

// Scrape a single product
router.post('/product', validateScrapeRequest, async (req, res, next) => {
  try {
    const { platform, url, forceRefresh = false } = req.body;

    logger.info(`Scraping product from ${platform}: ${url}`);

    const result = await scraperManager.scrapeProduct(platform, url, {
      forceRefresh,
    });

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
});

// Search products
router.post('/search', async (req, res, next) => {
  try {
    const { platform, query, limit = 10, forceRefresh = false } = req.body;

    logger.info(`Searching ${platform} for: ${query}`);

    const results = await scraperManager.searchProducts(platform, query, {
      limit,
      forceRefresh,
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });

  } catch (error) {
    next(error);
  }
});

// Scrape multiple platforms
router.post('/multi-platform', async (req, res, next) => {
  try {
    const { productIdentifier, platforms = [] } = req.body;

    logger.info(`Multi-platform scraping for: ${productIdentifier}`);

    const results = await scraperManager.scrapeMultiplePlatforms(
      productIdentifier,
      platforms
    );

    res.json({
      success: true,
      data: results,
    });

  } catch (error) {
    next(error);
  }
});

// Get supported platforms
router.get('/platforms', (req, res) => {
  const platforms = Array.from(scraperManager.scrapers.keys());
  
  res.json({
    success: true,
    data: platforms,
  });
});

module.exports = router;