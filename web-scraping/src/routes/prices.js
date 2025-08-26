const express = require('express');
const router = express.Router();
const priceTracker = require('../services/priceTracker');
const logger = require('../utils/logger');

// Get price history for a part
router.get('/history/:partId', async (req, res, next) => {
  try {
    const { partId } = req.params;
    const { platform, days = 30 } = req.query;

    const history = await priceTracker.getPriceHistory(partId, {
      platform,
      days: parseInt(days, 10),
    });

    res.json({
      success: true,
      data: history,
    });

  } catch (error) {
    next(error);
  }
});

// Track price for a part
router.post('/track', async (req, res, next) => {
  try {
    const { partId, platforms = [], targetPrice, notifyEmail } = req.body;

    await priceTracker.trackPart(partId, {
      platforms,
      targetPrice,
      notifyEmail,
    });

    res.json({
      success: true,
      message: 'Price tracking activated',
    });

  } catch (error) {
    next(error);
  }
});

// Get current prices across platforms
router.get('/current/:partId', async (req, res, next) => {
  try {
    const { partId } = req.params;

    const prices = await priceTracker.getCurrentPrices(partId);

    res.json({
      success: true,
      data: prices,
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;